<script lang="ts">
  /**
   * Full-viewport branding overlay until the user dismisses it (after the app is ready).
   * Logo: place `public/ShaderNoice-logo.png` (optional; hidden if missing or broken).
   */
  import { fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { IconSvg } from '../icon';
  import LayeredAppLogo from './LayeredAppLogo.svelte';
  import AppSplashSysWarn from './AppSplashSysWarn.svelte';
  import { pickSplashTagline } from './appSplashSysWarnScript';
  import { readCssTimeMs } from '../../../../utils/readCssTimeMs';

  interface Props {
    /** `'checking'` while resolving OAuth/session; `'signin'` shows the Audiotool action when callbacks are wired. */
    audiotoolPhase?: 'checking' | 'signin';
    /** Phase `signin`: optional error detail under the subtitle. */
    audiotoolError?: string | null;
    /** Phase `signin`: starts redirect to Audiotool consent screen (omit when OAuth gate is inactive). */
    onAudiotoolSignIn?: () => void;
    /** Phase `signin`: primary action label (e.g. Retry after a failed init). */
    audiotoolSignInLabel?: string;
    /** Phase `signin`: enter the editor without an Audiotool session (optional OAuth gate). */
    onContinueWithoutAudiotool?: () => void | Promise<void>;
    /** While editor bootstrap runs after "Continue without signing in", disable actions. */
    audiotoolBootstrapping?: boolean;
    /** OAuth callback landed — splash part 3 beat. */
    oauthReturnBeat?: boolean;
    /** Session not ready yet — suppress other intro beats. */
    oauthReturnPending?: boolean;
    onOAuthReturnBeatComplete?: () => void;

    /** When true, initial load finished — user can dismiss. */
    ready?: boolean;
    onDismiss?: () => void;
    titleShader?: string;
    titleNoice?: string;
    /** Omit to rotate among built-in taglines once per session. */
    subtitle?: string;
    /**
     * Optional legacy single-image logo. If omitted, the splash uses the layered
     * mask-based logo from `public/app-logo/`.
     *
     * Resolved against site base, e.g. `/ShaderNoice/ShaderNoice-logo.png`
     */
    logoSrc?: string;
    /**
     * When set (project hub inside splash), wide layout + interactive panel.
     * Parent should set {@link preventActivateDismiss} while the hub is actionable.
     */
    hub?: import('svelte').Snippet;
    /** Block backdrop / Escape dismiss (e.g. project hub picking). */
    preventActivateDismiss?: boolean;
  }

  let {
    audiotoolPhase = 'checking',
    audiotoolError = null,
    onAudiotoolSignIn,
    audiotoolSignInLabel = 'Sign in',
    onContinueWithoutAudiotool,
    audiotoolBootstrapping = false,
    oauthReturnBeat = false,
    oauthReturnPending = false,
    onOAuthReturnBeatComplete,
    ready = false,
    onDismiss,
    titleShader = 'Shader',
    titleNoice = 'Noice',
    subtitle,
    logoSrc,
    hub,
    preventActivateDismiss = false,
  }: Props = $props();

  /** Splash dismiss is blocked while resolving OAuth or when Audiotool / continue actions must capture input. */
  const oauthSplashBlocksDismiss = $derived(
    audiotoolPhase === 'checking' ||
      onAudiotoolSignIn != null ||
      onContinueWithoutAudiotool != null ||
      audiotoolBootstrapping ||
      preventActivateDismiss
  );

  /** When OAuth-phase controls are actionable, constrain pointer-events/cursor vs overlay dismiss. */
  const oauthSignInChromeVisible = $derived(
    audiotoolPhase === 'signin' &&
      (onAudiotoolSignIn != null ||
        onContinueWithoutAudiotool != null ||
        audiotoolBootstrapping ||
        hub != null)
  );

  let logoFailed = $state(false);
  let warnLive = $state(false);
  let dismissing = $state(false);
  let sessionTagline = $state<string | undefined>(undefined);

  const splashTitle = $derived(`${titleShader}${titleNoice}`);
  const splashTitleChars = $derived([...splashTitle]);
  /** One full left-to-right blink wave, then a short pause before repeat. */
  const titleBlinkCycleMs = 2800;
  const titleBlinkStaggerMs = $derived(
    splashTitleChars.length > 0 ? titleBlinkCycleMs / splashTitleChars.length : 0,
  );

  const resolvedSubtitle = $derived(subtitle ?? sessionTagline ?? 'Fries GPUs for breakfast.');
  const authPromptActive = $derived(
    audiotoolPhase === 'signin' && (onAudiotoolSignIn != null || onContinueWithoutAudiotool != null),
  );
  const brandMarkClass = $derived(
    warnLive ? 'app-splash__brand-mark app-splash__brand-mark--warn-live' : 'app-splash__brand-mark'
  );

  let reduceMotion = $state(false);
  $effect.pre(() => {
    if (sessionTagline === undefined && subtitle == null && typeof window !== 'undefined') {
      sessionTagline = pickSplashTagline();
    }
  });
  $effect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotion = mq.matches;
    const handler = (): void => {
      reduceMotion = mq.matches;
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  });

  const fadeMs = $derived.by(() => {
    if (typeof window === 'undefined') return 200;
    const fast = readCssTimeMs('--motion-effects-fast-duration');
    const normal = readCssTimeMs('--motion-effects-normal-duration');
    // Shorter when reduced motion; never 0 or the dismiss feels like a hard cut.
    if (reduceMotion) {
      return Number.isFinite(fast) ? fast : 150;
    }
    return Number.isFinite(normal) ? normal : Number.isFinite(fast) ? fast : 200;
  });

  function dismissSplash(): void {
    if (!ready || !onDismiss || oauthSplashBlocksDismiss || dismissing) return;
    dismissing = true;
    onDismiss();
  }

  function handleActivate(): void {
    dismissSplash();
  }

  /** Escape dismisses without moving focus onto the overlay (no focus steal on open). */
  $effect(() => {
    if (typeof window === 'undefined' || oauthSplashBlocksDismiss || !ready || !onDismiss) return;
    function onGlobalKeydown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault();
        dismissSplash();
      }
    }
    window.addEventListener('keydown', onGlobalKeydown);
    return () => window.removeEventListener('keydown', onGlobalKeydown);
  });

  const splashAriaBusy = $derived(
    audiotoolPhase === 'checking' ||
      audiotoolBootstrapping ||
      (!ready && onAudiotoolSignIn == null && onContinueWithoutAudiotool == null)
  );
</script>

<div
  id="app-splash-root"
  class="app-splash"
  class:app-splash--ready={ready && !oauthSplashBlocksDismiss}
  class:app-splash--audiotool={oauthSignInChromeVisible}
  class:app-splash--hub={hub != null}
  role={oauthSplashBlocksDismiss || ready ? 'dialog' : 'status'}
  aria-modal={audiotoolPhase === 'checking' ||
  onAudiotoolSignIn != null ||
  onContinueWithoutAudiotool != null ||
  audiotoolBootstrapping ||
  ready
    ? 'true'
    : undefined}
  aria-busy={splashAriaBusy}
  aria-labelledby="app-splash-title"
  aria-describedby="app-splash-desc"
  transition:fade={() => ({ duration: fadeMs, easing: cubicOut })}
  onclick={handleActivate}
>
  <header class="app-splash__header">
    {#if logoSrc && !logoFailed}
      <img
        src={logoSrc}
        alt=""
        class="app-splash__logo"
        width="64"
        height="64"
        onerror={() => {
          logoFailed = true;
        }}
      />
    {:else if !logoSrc}
      <LayeredAppLogo variant="compact" class={brandMarkClass} />
    {/if}
    <h1
      id="app-splash-title"
      class="app-splash__title"
      class:app-splash__title--blink={!reduceMotion}
      aria-label={splashTitle}
      style:--title-blink-cycle="{titleBlinkCycleMs}ms"
      style:--title-blink-stagger="{titleBlinkStaggerMs}ms"
    >
      {#each splashTitleChars as char, i (i)}
        <span class="app-splash__title-letter" style:--letter-i={i}>{char}</span>
      {/each}
    </h1>
  </header>

  <div class="app-splash__center">
    <div class="app-splash__inner">
      <AppSplashSysWarn
        id="app-splash-desc"
        text={resolvedSubtitle}
        errorText={audiotoolPhase === 'signin' ? audiotoolError : null}
        audiotoolPhase={audiotoolPhase}
        authPromptActive={authPromptActive}
        onAudiotoolSignIn={onAudiotoolSignIn}
        audiotoolSignInLabel={audiotoolSignInLabel}
        onContinueWithoutAudiotool={onContinueWithoutAudiotool}
        audiotoolBootstrapping={audiotoolBootstrapping}
        {oauthReturnBeat}
        oauthReturnPending={oauthReturnPending}
        {onOAuthReturnBeatComplete}
        {ready}
        {dismissing}
        {reduceMotion}
        onLiveChange={(live) => {
          warnLive = live;
        }}
      />
      {#if hub}
        <div class="app-splash__hub-panel">
          {@render hub()}
        </div>
      {/if}
    </div>
  </div>

  <footer class="app-splash__footer">
    <span
      class="app-splash__compat"
      role="note"
      aria-label="Best in Chrome or Chromium-based browsers. Video export uses WebCodecs (VideoEncoder and AudioEncoder), so other browsers may be limited."
      title="Video export uses WebCodecs; other browsers may be limited."
    >
      <span class="app-splash__compat-icon" aria-hidden="true">
        <IconSvg name="google-chrome-logo" variant="filled" />
      </span>
      Best in Chrome/Chromium
    </span>
  </footer>
</div>

<style>
  .app-splash {
    position: fixed;
    inset: 0;
    z-index: 1100;
    display: grid;
    grid-template-rows: auto 1fr auto;
    align-items: stretch;
    box-sizing: border-box;
    padding: var(--pd-2xl);
    font-family: var(--font-sans);
    background: var(--layout-bg);
    color: var(--print-default);
    pointer-events: auto;
    cursor: wait;
    outline: none;
  }

  .app-splash--ready {
    cursor: pointer;
  }

  .app-splash--audiotool {
    cursor: default;
  }

  .app-splash--audiotool.app-splash--ready {
    cursor: default;
  }

  .app-splash--ready:focus-visible {
    box-shadow: inset 0 0 0 2px var(--color-blue-90);
  }

  /** Logo glow intensifies while the sys-warn HUD is actively emitting. */
  .app-splash :global(.app-splash__brand-mark--warn-live) {
    filter: drop-shadow(0 0 10px color-mix(in srgb, var(--color-violet-90) 28%, transparent))
      drop-shadow(0 0 22px color-mix(in srgb, var(--sys-warn-hud-accent) 18%, transparent))
      drop-shadow(0 0 36px color-mix(in srgb, var(--sys-warn-hud-frame) 12%, transparent));
    transition: filter 480ms ease;
  }

  .app-splash__header {
    justify-self: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--pd-sm);
    pointer-events: none;
  }

  .app-splash__center {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    width: 100%;
    pointer-events: none;
    /* Bias above vertical center — keeps logo/title + HUD as one cluster higher on screen. */
    padding-bottom: clamp(var(--pd-3xl), 10vh, 5.5rem);
  }

  .app-splash__inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: var(--pd-sm);
    width: 100%;
    max-width: min(100%, 28rem);
    pointer-events: none;
  }

  .app-splash__footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--pd-lg);
    width: 100%;
    pointer-events: none;
  }

  .app-splash--hub .app-splash__inner {
    max-width: min(100%, 44rem);
  }

  /** Hub content is rendered via snippet (child components); targets must be global */
  .app-splash :global(.app-splash__hub-panel),
  .app-splash :global(.app-splash__hub-panel *) {
    pointer-events: auto;
    cursor: default;
  }

  .app-splash--hub:not(.app-splash--audiotool) {
    cursor: default;
  }

  /**
   * Descendants use pointer-events: none so overlay dismiss hits the root (not inherited).
   * Re-enable auth menu rows after this rule: Svelte scoping makes
   * `.app-splash--audiotool .app-splash__center *` beat a shallower
   * `.app-splash--audiotool button.sys-warn__line--menu` exception.
   */
  .app-splash--audiotool .app-splash__center *,
  .app-splash--audiotool .app-splash__footer * {
    pointer-events: none;
  }

  .app-splash:not(.app-splash--audiotool) .app-splash__center *,
  .app-splash:not(.app-splash--audiotool) .app-splash__footer * {
    pointer-events: none;
  }

  .app-splash--audiotool .app-splash__center :global(button.sys-warn__line--menu) {
    pointer-events: auto;
    cursor: default;
  }

  /**
   * Slow CCW drift: each half-revolution uses a different ease so speed is non-linear
   * but the loop stays seamless at 0°/360°.
   */
  @keyframes app-splash-logo-ccw {
    0% {
      transform: rotate(0deg);
      animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
    }
    50% {
      transform: rotate(-180deg);
      animation-timing-function: cubic-bezier(0.64, 0, 0.78, 0.39);
    }
    100% {
      transform: rotate(-360deg);
    }
  }

  /** Pulses halo strength only (paired with rotate on the same element). */
  @keyframes app-splash-logo-glow {
    0%,
    100% {
      filter: drop-shadow(0 0 7px color-mix(in srgb, var(--color-violet-90) 22%, transparent))
        drop-shadow(0 0 16px color-mix(in srgb, var(--print-light) 10%, transparent))
        drop-shadow(0 0 32px color-mix(in srgb, var(--print-light) 5%, transparent));
    }
    50% {
      filter: drop-shadow(0 0 14px color-mix(in srgb, var(--color-purple-110) 42%, transparent))
        drop-shadow(0 0 28px color-mix(in srgb, var(--print-light) 18%, transparent))
        drop-shadow(0 0 48px color-mix(in srgb, var(--color-red-orange-110) 9%, transparent));
    }
  }

  .app-splash__logo {
    width: 64px;
    height: 64px;
    object-fit: contain;
    border-radius: var(--radius-md);
    flex-shrink: 0;
    transform-origin: center center;
    animation:
      app-splash-logo-ccw 42s infinite,
      app-splash-logo-glow 31s ease-in-out infinite;
    /* drop-shadow follows non-transparent pixels (works with PNG alpha); box-shadow does not */
    filter: drop-shadow(0 0 7px color-mix(in srgb, var(--print-light) 22%, transparent))
      drop-shadow(0 0 16px color-mix(in srgb, var(--print-light) 10%, transparent))
      drop-shadow(0 0 32px color-mix(in srgb, var(--print-light) 5%, transparent));
  }

  @media (prefers-reduced-motion: reduce) {
    .app-splash__logo {
      animation: none;
      filter: drop-shadow(0 0 10px color-mix(in srgb, var(--print-light) 30%, transparent))
        drop-shadow(0 0 22px color-mix(in srgb, var(--print-light) 14%, transparent))
        drop-shadow(0 0 40px color-mix(in srgb, var(--print-light) 6%, transparent));
    }
  }

  @keyframes app-splash-title-letter-blink {
    0%,
    4% {
      background-color: transparent;
      color: var(--print-light);
    }
    5%,
    14% {
      background-color: var(--title-cursor-bg);
      color: var(--title-cursor-fg);
    }
    15%,
    100% {
      background-color: transparent;
      color: var(--print-light);
    }
  }

  .app-splash__title {
    margin: 0;
    font-size: var(--text-sm);
    font-weight: 400;
    font-family: var(--font-mono);
    color: var(--print-light);
    --title-cursor-bg: var(--print-light);
    --title-cursor-fg: var(--layout-bg);
    letter-spacing: -0.02em;
    line-height: 1.15;
  }

  .app-splash__title-letter {
    display: inline-block;
    padding-inline: 0.07em;
    margin-inline: -0.03em;
    border-radius: 0;
    background-color: transparent;
  }

  .app-splash__title--blink .app-splash__title-letter {
    animation: app-splash-title-letter-blink var(--title-blink-cycle, 2800ms) steps(100, jump-end) infinite;
    animation-delay: calc(var(--letter-i) * var(--title-blink-stagger, 255ms));
  }

  @media (prefers-reduced-motion: reduce) {
    .app-splash__title-letter {
      animation: none;
    }
  }

  .app-splash__compat {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--pd-md);
    border-radius: 999px;
    font-size: var(--text-sm);
    line-height: 1;
    font-weight: 300;
    font-family: var(--font-mono);
    color: var(--color-yellow-gray-100);
    user-select: none;
    pointer-events: none;
  }

  .app-splash__compat-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    opacity: 0.9;
  }

</style>
