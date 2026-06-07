<script lang="ts">

  import SysWarnAnimated from './SysWarnAnimated.svelte';

  import {

    SHADERNOICE_CODENAME,

    SPLASH_AUTH_AWAIT_STATUS,

    SPLASH_DISMISS_AWAIT_STATUS,

    SPLASH_HANDOFF_STATUS,

    SPLASH_OAUTH_RETURN_STATUS,

    SPLASH_OAUTH_RETURN_MIN_HOLD_MS,

    SPLASH_SIGNIN_HANDOFF_MIN_HOLD_MS,

    buildSplashAuthIntroSequence,

    buildSplashBriefIntroSequence,

    buildSplashHandoffSequence,

    buildSplashOAuthReturnSequence,

    buildSplashStaticLines,

    clearSplashOAuthHandoffPending,

    markSplashOAuthHandoffPending,

    pickSplashAuthBootLines,

    SPLASH_INTRO_SETTLE_MS,

    type SplashAuthBootLine,

    type SplashHandoffKind,

    type SysWarnMenuAction,

  } from './appSplashSysWarnScript';



  interface Props {

    text: string;

    errorText?: string | null;

    ready?: boolean;

    /** Hold intro until Audiotool auth phase is known (skip animation during `checking`). */

    audiotoolPhase?: 'checking' | 'signin';

    /** OAuth callback with linked session — splash part 3. */

    oauthReturnBeat?: boolean;

    oauthReturnPending?: boolean;

    dismissing?: boolean;

    reduceMotion?: boolean;

    authPromptActive?: boolean;

    onAudiotoolSignIn?: () => void;

    audiotoolSignInLabel?: string;

    onContinueWithoutAudiotool?: () => void | Promise<void>;

    audiotoolBootstrapping?: boolean;

    id?: string;

    onLiveChange?: (live: boolean) => void;

    onCommandsReadyChange?: (ready: boolean) => void;

    onOAuthReturnBeatComplete?: () => void;

  }



  let {

    text,

    errorText = null,

    ready = false,

    audiotoolPhase = 'checking',

    oauthReturnBeat = false,
    oauthReturnPending = false,

    dismissing = false,

    reduceMotion = false,

    authPromptActive = false,

    onAudiotoolSignIn,

    audiotoolSignInLabel = 'Sign in',

    onContinueWithoutAudiotool,

    audiotoolBootstrapping = false,

    id,

    onLiveChange,

    onCommandsReadyChange,

    onOAuthReturnBeatComplete,

  }: Props = $props();



  let handoffKind = $state<SplashHandoffKind | null>(null);

  let authBootLines = $state<readonly SplashAuthBootLine[] | null>(null);

  let commandsReady = $state(false);

  let selectedMenuAction = $state<SysWarnMenuAction | null>(null);

  let signInRedirectPending = $state(false);



  $effect.pre(() => {

    if (authPromptActive && authBootLines == null) {

      authBootLines = pickSplashAuthBootLines();

    }

  });



  const introActive = $derived(
    oauthReturnPending && !oauthReturnBeat
      ? false
      : oauthReturnBeat
        ? true
        : authPromptActive
          ? audiotoolPhase === 'signin'
          : true,
  );

  const transitionActive = $derived(

    !oauthReturnBeat && (handoffKind != null || audiotoolBootstrapping),

  );

  const showSignIn = $derived(authPromptActive && onAudiotoolSignIn != null && !transitionActive);

  const showGuest = $derived(

    authPromptActive && onContinueWithoutAudiotool != null && !transitionActive,

  );

  const showAuthMenu = $derived(authPromptActive && (showSignIn || showGuest));

  const menuActions = $derived(

    [

      showSignIn ? ('signin' as const) : null,

      showGuest ? ('guest' as const) : null,

    ].filter((action): action is SysWarnMenuAction => action != null),

  );

  const introSequenceKey = $derived(

    oauthReturnBeat

      ? 'oauth-return'

      : authPromptActive

        ? `auth:${showSignIn}:${showGuest}:${audiotoolSignInLabel}`

        : `brief:${text}`,

  );

  const phaseMinHoldMs = $derived(

    oauthReturnBeat

      ? SPLASH_OAUTH_RETURN_MIN_HOLD_MS

      : handoffKind === 'signin'

        ? SPLASH_SIGNIN_HANDOFF_MIN_HOLD_MS

        : 0,

  );



  function buildTypingSequence(_tagline: string) {

    if (oauthReturnBeat) {

      return buildSplashOAuthReturnSequence();

    }

    if (authPromptActive) {

      return buildSplashAuthIntroSequence(

        authBootLines ?? pickSplashAuthBootLines(),

        showAuthMenu

          ? { showSignIn, showGuest, signInLabel: audiotoolSignInLabel }

          : undefined,

      );

    }

    return buildSplashBriefIntroSequence(text);

  }



  function buildStaticLines(tagline: string, err: string | null | undefined) {

    if (oauthReturnBeat) {

      return buildSplashStaticLines(tagline, err, 'oauth-return');

    }



    const bootLines = authBootLines ?? pickSplashAuthBootLines();

    const authMenu = showAuthMenu

      ? { showSignIn, showGuest, signInLabel: audiotoolSignInLabel }

      : undefined;



    if (transitionActive && handoffKind === 'signin') {

      return buildSplashStaticLines(tagline, err, 'handoff-signin');

    }

    if (transitionActive && handoffKind === 'guest') {

      return buildSplashStaticLines(tagline, err, 'handoff-guest');

    }

    if (authPromptActive) {

      return buildSplashStaticLines(tagline, err, 'auth-intro', bootLines, authMenu);

    }

    if (ready) {

      return buildSplashStaticLines(tagline, err, 'brief-ready');

    }

    return buildSplashStaticLines(tagline, err, 'brief');

  }



  function buildTransitionSequence() {

    return buildSplashHandoffSequence(handoffKind ?? 'guest', text);

  }



  function beginHandoff(kind: SplashHandoffKind): void {

    if (transitionActive) return;

    handoffKind = kind;

  }



  function handleSignIn(): void {

    if (audiotoolBootstrapping || transitionActive || !onAudiotoolSignIn) return;

    markSplashOAuthHandoffPending();

    signInRedirectPending = true;

    beginHandoff('signin');

  }



  function handleGuest(): void {

    if (audiotoolBootstrapping || !onContinueWithoutAudiotool || transitionActive) return;

    beginHandoff('guest');

    void onContinueWithoutAudiotool();

  }



  function handlePhaseBeatReady(): void {

    if (oauthReturnBeat) {

      clearSplashOAuthHandoffPending();

      onOAuthReturnBeatComplete?.();

      return;

    }

    if (signInRedirectPending && handoffKind === 'signin') {

      signInRedirectPending = false;

      onAudiotoolSignIn?.();

    }

  }



  $effect(() => {

    showAuthMenu;

    selectedMenuAction = null;

  });



  $effect(() => {

    if (!showAuthMenu || typeof window === 'undefined') return;



    function onKeydown(e: KeyboardEvent): void {

      if (audiotoolBootstrapping || transitionActive || !commandsReady) return;



      if (e.key === 'ArrowUp') {

        e.preventDefault();

        if (menuActions.length === 0) return;

        if (selectedMenuAction == null) {

          selectedMenuAction = menuActions[menuActions.length - 1] ?? null;

          return;

        }

        const index = menuActions.indexOf(selectedMenuAction);

        if (index > 0) selectedMenuAction = menuActions[index - 1] ?? null;

        return;

      }



      if (e.key === 'ArrowDown') {

        e.preventDefault();

        if (menuActions.length === 0) return;

        if (selectedMenuAction == null) {

          selectedMenuAction = menuActions[0] ?? null;

          return;

        }

        const index = menuActions.indexOf(selectedMenuAction);

        if (index >= 0 && index < menuActions.length - 1) {

          selectedMenuAction = menuActions[index + 1] ?? null;

        }

        return;

      }



      if (e.key === 'Enter') {

        if (selectedMenuAction === 'signin' && showSignIn) {

          e.preventDefault();

          handleSignIn();

        } else if (selectedMenuAction === 'guest' && showGuest) {

          e.preventDefault();

          handleGuest();

        }

        return;

      }



      const key = e.key.toLowerCase();

      if (key === 'a' && showSignIn) {

        e.preventDefault();

        selectedMenuAction = 'signin';

        handleSignIn();

      } else if (key === 'g' && showGuest) {

        e.preventDefault();

        selectedMenuAction = 'guest';

        handleGuest();

      }

    }



    window.addEventListener('keydown', onKeydown);

    return () => window.removeEventListener('keydown', onKeydown);

  });

</script>



<SysWarnAnimated

  {id}

  {text}

  {errorText}

  active={introActive}

  rush={ready}

  {dismissing}

  {reduceMotion}

  channel={SHADERNOICE_CODENAME}

  {buildTypingSequence}

  {buildStaticLines}

  {introSequenceKey}

  commandsActive={authPromptActive && showAuthMenu}

  commandsEarly={authPromptActive && showAuthMenu}

  introSettleMs={authPromptActive ? SPLASH_INTRO_SETTLE_MS : undefined}

  readyPromptActive={ready && !authPromptActive && !oauthReturnBeat}

  {oauthReturnBeat}

  oauthReturnSettledStatusLabel={SPLASH_OAUTH_RETURN_STATUS}

  {transitionActive}

  transitionReplaceContent={handoffKind === 'signin'}

  {buildTransitionSequence}

  {phaseMinHoldMs}

  onPhaseBeatReady={handlePhaseBeatReady}

  transitionSettledStatusLabel={SPLASH_HANDOFF_STATUS}

  settledStatusLabel={authPromptActive

    ? SPLASH_AUTH_AWAIT_STATUS

    : ready

      ? SPLASH_DISMISS_AWAIT_STATUS

      : undefined}

  ariaLabelPrefix="System advisory"

  {onLiveChange}

  onCommandsReadyChange={(ready) => {

    commandsReady = ready;

    onCommandsReadyChange?.(ready);

  }}

  {selectedMenuAction}

  onMenuSignIn={showSignIn ? handleSignIn : undefined}

  onMenuGuest={showGuest ? handleGuest : undefined}

  menuBootstrapping={audiotoolBootstrapping || transitionActive}

/>

