<script lang="ts">
  /**
   * Animated sys-warn panel: boot log typewriter, optional error append, phase chrome.
   * Pass `active={false}` to defer the sequence until the user can see the panel (e.g. after a native file picker).
   */
  import { untrack } from 'svelte';
  import SysWarnPanel from './SysWarnPanel.svelte';
  import {
    SPLASH_BOOT_STATUS,
    SPLASH_INTRO_SETTLE_MS,
    SPLASH_OAUTH_RETURN_STATUS,
    actionDelay,
    buildSplashReadyPromptSequence,
    buildSysWarnErrorSequence,
    charTypingDelay,
    type SysWarnDisplayLine,
    type SysWarnMenuAction,
    type SysWarnTypingAction,
  } from './appSplashSysWarnScript';

  interface Props {
    text: string;
    errorText?: string | null;
    /** When false, hold idle until the panel should animate (e.g. after save destination picked). */
    active?: boolean;
    /** Rush remaining typing (splash dismiss). */
    rush?: boolean;
    /** Parent overlay outro — freeze chrome so opacity fade stays in sync. */
    dismissing?: boolean;
    reduceMotion?: boolean;
    channel?: string;
    buildTypingSequence: (text: string) => SysWarnTypingAction[];
    buildStaticLines: (text: string, errorText?: string | null) => SysWarnDisplayLine[];
    /** Bumps when the intro sequence identity changes (avoids restarts on unrelated prop churn). */
    introSequenceKey?: string;
    /** Status label once typing has settled; defaults to ::ack. */
    settledStatusLabel?: string;
    /** Status while boot lines are still typing. */
    bootStatusLabel?: string;
    /** Append dismiss prompt once the parent marks the splash ready. */
    readyPromptActive?: boolean;
    /** Reveal menu rows as soon as intro typing finishes (options are part of the intro sequence). */
    commandsEarly?: boolean;
    /** Show footer command rows (auth splash). */
    commandsActive?: boolean;
    /** Post-interaction handoff — hide commands and append transition typing. */
    transitionActive?: boolean;
    buildTransitionSequence?: () => SysWarnTypingAction[];
    transitionSettledStatusLabel?: string;
    /** Ms to hold after intro `complete` before settled (auth intro uses a short beat). */
    introSettleMs?: number;
    /** Extra dwell once a phase finishes typing and settles (OAuth handoff / return). */
    phaseMinHoldMs?: number;
    /** Replace body lines when a transition sequence starts (OAuth sign-in handoff). */
    transitionReplaceContent?: boolean;
    /** OAuth callback landed — part 3 intro instead of brief replay. */
    oauthReturnBeat?: boolean;
    oauthReturnSettledStatusLabel?: string;
    onPhaseBeatReady?: () => void;
    footer?: import('svelte').Snippet;
    ariaLabelPrefix?: string;
    ariaLabel?: string;
    id?: string;
    class?: string;
    onLiveChange?: (live: boolean) => void;
    onCommandsReadyChange?: (ready: boolean) => void;
    onMenuSignIn?: () => void;
    onMenuGuest?: () => void;
    selectedMenuAction?: SysWarnMenuAction | null;
    menuBootstrapping?: boolean;
  }

  let {
    text,
    errorText = null,
    active = true,
    rush = false,
    dismissing = false,
    reduceMotion = false,
    channel = 'system',
    buildTypingSequence,
    buildStaticLines,
    introSequenceKey = 'default',
    settledStatusLabel,
    bootStatusLabel = SPLASH_BOOT_STATUS,
    readyPromptActive = false,
    commandsEarly = false,
    commandsActive = false,
    transitionActive = false,
    buildTransitionSequence,
    transitionSettledStatusLabel = '::handoff',
    introSettleMs = SPLASH_INTRO_SETTLE_MS,
    phaseMinHoldMs = 0,
    transitionReplaceContent = false,
    oauthReturnBeat = false,
    oauthReturnSettledStatusLabel = SPLASH_OAUTH_RETURN_STATUS,
    onPhaseBeatReady,
    footer,
    ariaLabelPrefix = 'System warning',
    ariaLabel: ariaLabelOverride,
    id,
    class: className = '',
    onLiveChange,
    onCommandsReadyChange,
    onMenuSignIn,
    onMenuGuest,
    selectedMenuAction = null,
    menuBootstrapping = false,
  }: Props = $props();

  let headerReady = $state(false);
  let mainComplete = $state(false);
  let typingDone = $state(false);
  let settled = $state(false);
  let transitionComplete = $state(false);
  let completedLines = $state<SysWarnDisplayLine[]>([]);
  let activePrefix = $state('');
  let activeText = $state('');
  let activeVariant = $state<SysWarnDisplayLine['variant']>('boot');
  let activeMenuAction = $state<SysWarnDisplayLine['menuAction']>(undefined);
  let showCursor = $state(false);
  let shownError = $state<string | null>(null);
  let readyPromptShown = $state(false);

  const rushRef: { value: boolean } = { value: false };
  const transitionRunRef: { started: boolean } = { started: false };
  const readyPromptRunRef: { started: boolean } = { started: false };
  const phaseBeatReadyRef: { fired: boolean } = { fired: false };

  const isTyping = $derived(active && headerReady && !typingDone);
  const isLive = $derived(
    active && headerReady && !settled && !reduceMotion && !dismissing && !transitionActive,
  );
  /**
   * Menu rows finish inside the intro `complete` beat (`mainComplete`).
   * Do not also require `typingDone` — follow-up error typing temporarily clears
   * `typingDone` and would disable Sign in / Guest after a failed OAuth return.
   */
  const commandsReady = $derived(
    commandsActive &&
      !transitionActive &&
      (reduceMotion || commandsEarly ? mainComplete : false),
  );

  const awaitUserInput = $derived(
    settled &&
      !transitionActive &&
      !dismissing &&
      ((readyPromptActive && readyPromptShown) || (commandsReady && commandsActive)),
  );

  /** Blinking cursor on the last line once the final beat finishes typing. */
  const showIdleCursor = $derived(
    active &&
      !dismissing &&
      !reduceMotion &&
      typingDone &&
      settled &&
      ((commandsActive && commandsReady) ||
        (readyPromptActive && readyPromptShown) ||
        (transitionActive && transitionComplete) ||
        (oauthReturnBeat && mainComplete)),
  );

  const statusLabel = $derived.by(() => {
    if (!active) return '::wait';
    if (oauthReturnBeat && mainComplete && settled) return oauthReturnSettledStatusLabel;
    if (transitionActive && transitionComplete && settled) return transitionSettledStatusLabel;
    if (transitionActive) return '::handoff';
    if (awaitUserInput) return settledStatusLabel ?? '::user.req';
    if (commandsReady && settled) return settledStatusLabel ?? '::user.req';
    if (settled) return settledStatusLabel ?? '::ack';
    if (!typingDone && headerReady && !mainComplete) return bootStatusLabel;
    if (!typingDone) return '::emit';
    return mainComplete ? '::lock' : '::emit';
  });

  const ariaLabel = $derived.by(() => {
    if (ariaLabelOverride) return ariaLabelOverride;
    const parts = [...completedLines.map((line) => line.text), activeText].filter(Boolean);
    const base = parts.join(' ');
    const err = errorText?.trim();
    return err
      ? `${ariaLabelPrefix}: ${base}. Error: ${err}`
      : `${ariaLabelPrefix}: ${base || text}`;
  });

  $effect(() => {
    onLiveChange?.(isLive);
  });

  $effect(() => {
    onCommandsReadyChange?.(commandsReady);
  });

  $effect(() => {
    rushRef.value = rush;
  });

  $effect(() => {
    if (!transitionActive) {
      transitionComplete = false;
      transitionRunRef.started = false;
    }
  });

  function resetIdle(): void {
    headerReady = false;
    mainComplete = false;
    typingDone = false;
    settled = false;
    transitionComplete = false;
    transitionRunRef.started = false;
    shownError = null;
    readyPromptShown = false;
    readyPromptRunRef.started = false;
    completedLines = [];
    activePrefix = '';
    activeText = '';
    activeVariant = 'boot';
    activeMenuAction = undefined;
    showCursor = false;
  }

  function schedulePhaseBeatReady(schedule: (fn: () => void, ms: number) => void, settleDelay: number): void {
    if (phaseBeatReadyRef.fired || !onPhaseBeatReady) return;
    const holdMs = phaseMinHoldMs > 0 ? phaseMinHoldMs : 0;
    schedule(() => {
      settled = true;
      if (holdMs > 0) {
        schedule(() => {
          if (phaseBeatReadyRef.fired) return;
          phaseBeatReadyRef.fired = true;
          onPhaseBeatReady?.();
        }, holdMs);
      } else {
        phaseBeatReadyRef.fired = true;
        onPhaseBeatReady?.();
      }
    }, settleDelay);
  }

  function runSequence(
    sequence: SysWarnTypingAction[],
    options: {
      reset?: boolean;
      replaceContent?: boolean;
      settleMs?: number;
      phaseMinHoldMs?: number;
      onComplete?: () => void;
    } = {},
  ): () => void {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let actionIndex = 0;

    const schedule = (fn: () => void, ms: number): void => {
      timers.push(setTimeout(fn, ms));
    };

    if (options.reset) {
      headerReady = false;
      mainComplete = false;
      typingDone = false;
      settled = false;
      transitionComplete = false;
      transitionRunRef.started = false;
      shownError = null;
      completedLines = [];
      activePrefix = '';
      activeText = '';
      activeVariant = 'boot';
      activeMenuAction = undefined;
      showCursor = true;
      phaseBeatReadyRef.fired = false;
    } else if (options.replaceContent) {
      completedLines = [];
      activePrefix = '';
      activeText = '';
      activeVariant = 'boot';
      activeMenuAction = undefined;
      showCursor = true;
      phaseBeatReadyRef.fired = false;
    }

    const phaseHoldMs = options.phaseMinHoldMs ?? phaseMinHoldMs;

    const runAction = (): void => {
      while (actionIndex < sequence.length) {
        const action = sequence[actionIndex] as SysWarnTypingAction;
        actionIndex += 1;
        const rushNow = rushRef.value;

        if (action.kind === 'delay') {
          schedule(runAction, actionDelay(action.ms, rushNow));
          return;
        }

        if (action.kind === 'header') {
          headerReady = true;
          continue;
        }

        if (action.kind === 'line') {
          completedLines = [...completedLines, action.line];
          continue;
        }

        if (action.kind === 'char') {
          if (
            activePrefix !== action.line.prefix ||
            activeVariant !== action.line.variant ||
            activeMenuAction !== action.line.menuAction
          ) {
            activePrefix = action.line.prefix;
            activeVariant = action.line.variant;
            activeMenuAction = action.line.menuAction;
          }
          activeText += action.char;
          schedule(runAction, charTypingDelay(action.char, rushNow, action.pace ?? 'default'));
          return;
        }

        if (action.kind === 'backspace') {
          activeText = activeText.slice(0, -1);
          schedule(runAction, actionDelay(30, rushNow));
          return;
        }

        if (action.kind === 'lineBreak') {
          completedLines = [
            ...completedLines,
            {
              prefix: activePrefix,
              text: activeText,
              variant: activeVariant,
              ...(activeMenuAction != null ? { menuAction: activeMenuAction } : {}),
            },
          ];
          activeText = '';
          activePrefix = '';
          activeMenuAction = undefined;
          continue;
        }

        if (action.kind === 'complete') {
          showCursor = false;
          if (options.reset) {
            mainComplete = true;
          }
          typingDone = true;
          options.onComplete?.();
          const settleDelay = rushNow
            ? 120
            : options.settleMs ?? (options.reset ? introSettleMs : 700);
          if (phaseHoldMs > 0 && onPhaseBeatReady) {
            schedulePhaseBeatReady(schedule, settleDelay);
          } else {
            schedule(() => {
              settled = true;
            }, settleDelay);
          }
          return;
        }
      }
    };

    schedule(runAction, 0);

    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }

  function resetFollowUpSequences(): void {
    readyPromptShown = false;
    readyPromptRunRef.started = false;
  }

  $effect(() => {
    const tagline = text;
    const motionOff = reduceMotion;
    const canAnimate = active;
    const sequenceKey = introSequenceKey;

    if (!canAnimate) {
      resetIdle();
      return;
    }

    if (motionOff) {
      headerReady = true;
      mainComplete = true;
      typingDone = true;
      settled = true;
      transitionComplete = transitionActive || oauthReturnBeat;
      showCursor = false;
      if (oauthReturnBeat) {
        completedLines = buildStaticLines(tagline, errorText);
      } else {
        completedLines = buildStaticLines(tagline, errorText);
      }
      activePrefix = '';
      activeText = '';
      readyPromptShown = readyPromptActive;
      return;
    }

    resetFollowUpSequences();
    phaseBeatReadyRef.fired = false;
    if (oauthReturnBeat) {
      return runSequence(buildTypingSequence(tagline), {
        reset: true,
        settleMs: introSettleMs,
        phaseMinHoldMs,
      });
    }
    return runSequence(buildTypingSequence(tagline), { reset: true, settleMs: introSettleMs });
  });

  /** Click-to-dismiss prompt once the editor bootstrap is ready. */
  $effect(() => {
    const canPrompt =
      readyPromptActive &&
      active &&
      !reduceMotion &&
      !dismissing &&
      !transitionActive &&
      mainComplete &&
      settled &&
      !readyPromptRunRef.started;

    if (!canPrompt) return;

    readyPromptRunRef.started = true;
    typingDone = false;
    showCursor = true;

    return runSequence(buildSplashReadyPromptSequence(), {
      settleMs: introSettleMs,
      onComplete: () => {
        readyPromptShown = true;
        typingDone = true;
      },
    });
  });

  $effect(() => {
    if (!readyPromptActive) {
      readyPromptShown = false;
      readyPromptRunRef.started = false;
    }
  });

  /** Post-click handoff typing (guest load, OAuth redirect, etc.). */
  $effect(() => {
    const canTransition =
      transitionActive &&
      buildTransitionSequence &&
      active &&
      !reduceMotion &&
      !dismissing &&
      mainComplete &&
      !transitionRunRef.started;

    if (!canTransition) return;

    transitionRunRef.started = true;
    settled = false;
    typingDone = false;
    showCursor = true;
    phaseBeatReadyRef.fired = false;

    return runSequence(buildTransitionSequence(), {
      replaceContent: transitionReplaceContent,
      settleMs: introSettleMs,
      phaseMinHoldMs,
      onComplete: () => {
        transitionComplete = true;
        typingDone = true;
      },
    });
  });

  /**
   * Append auth / runtime errors after the main beat without replaying the boot log.
   * Depend only on `errorText` + `mainComplete` so unrelated prop churn cannot cancel an
   * in-flight error sequence and leave `typingDone`/settled stuck (OAuth token failures).
   */
  $effect(() => {
    const err = errorText?.trim() ?? null;
    const complete = mainComplete;

    if (!complete) {
      shownError = null;
      return;
    }

    if (!err) {
      shownError = null;
      return;
    }

    if (untrack(() => shownError) === err) return;
    if (untrack(() => !active || reduceMotion || transitionActive || dismissing)) return;

    if (untrack(() => shownError) != null) {
      completedLines = completedLines.filter((line) => line.variant !== 'error');
    }

    shownError = err;
    // Keep `typingDone` so auth menu commands stay armed while the error line types.
    settled = false;
    showCursor = true;

    return runSequence(buildSysWarnErrorSequence(err), {
      onComplete: () => {
        settled = true;
      },
    });
  });

  /** When rush becomes true after typing, settle chrome quickly. */
  $effect(() => {
    if (!active || !rush || reduceMotion || !typingDone || settled) return;
    const timer = setTimeout(() => {
      settled = true;
    }, 280);
    return () => clearTimeout(timer);
  });

  /** Splash outro: stop live chrome before the parent opacity fade runs. */
  $effect(() => {
    if (!dismissing) return;
    settled = true;
    typingDone = true;
    mainComplete = true;
    transitionComplete = transitionActive;
    showCursor = false;
  });
</script>

<SysWarnPanel
  {id}
  class={className}
  lines={completedLines}
  {statusLabel}
  {ariaLabel}
  {channel}
  {headerReady}
  {isTyping}
  {typingDone}
  {settled}
  {isLive}
  awaitUserInput={awaitUserInput}
  {activePrefix}
  {activeText}
  {activeVariant}
  {activeMenuAction}
  {showCursor}
  showIdleCursor={showIdleCursor}
  {dismissing}
  footer={commandsActive && !transitionActive && footer != null ? footer : undefined}
  {commandsReady}
  {onMenuSignIn}
  {onMenuGuest}
  {selectedMenuAction}
  menuBootstrapping={menuBootstrapping}
/>
