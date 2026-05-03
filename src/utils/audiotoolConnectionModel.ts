/**
 * Reduced state for Audiotool OAuth chrome + splash (IMPLEMENTATION_PLAN §8).
 * Editor bootstrap latch stays in {@link ./App.svelte}; this model owns connection UX only.
 */

import type { AuthenticatedClient } from '@audiotool/nexus';

export type AudiotoolConnectionPhase =
  | 'disabled'
  /** `initAudiotoolBrowserAuth` in flight */
  | 'checking'
  /** Known unauthenticated session; splash may wait for Continue */
  | 'disconnected'
  | 'connected'
  /** OAuth SDK init threw; splash Retry = reload */
  | 'init_error';

export interface AudiotoolConnectionState {
  oauthGateEnabled: boolean;
  phase: AudiotoolConnectionPhase;
  session: AuthenticatedClient | null;
  /** Splash primary action when `splashAudiotoolPhase === 'signin'` (Audiotool sign-in or Retry). */
  splashPrimaryAction: (() => void) | null;
  /** Cached login for chrome after splash dismissal (and after logout/session loss). */
  disconnectedLogin: (() => void) | null;
  splashSignInLabel: string;
  oauthErrorDetail: string | null;
  editorBootstrapInFlight: boolean;
}

export type AudiotoolConnectionEvent =
  | { type: 'AUTH_CHECKING' }
  | { type: 'AUTH_UNAUTHENTICATED'; login: () => void; oauthErrorDetail: string | null }
  | { type: 'AUTH_CONNECTED'; session: AuthenticatedClient }
  | { type: 'AUTH_INIT_FAILED'; message: string; retryReload: () => void }
  | { type: 'LOGOUT_AND_CLEAR_SESSION' }
  /** After forced disconnect (logout or RPC auth failure): login callback restored from Nexus. */
  | { type: 'DISCONNECTED_LOGIN_RESTORED'; login: () => void }
  /** Access token revoked / expired from server perspective — same as logout without calling Nexus logout(). */
  | { type: 'SESSION_INVALIDATED_BY_SERVER' }
  | { type: 'BOOTSTRAP_IN_FLIGHT'; inFlight: boolean };

export function createInitialAudiotoolConnection(oauthGateEnabled: boolean): AudiotoolConnectionState {
  if (!oauthGateEnabled) {
    return {
      oauthGateEnabled: false,
      phase: 'disabled',
      session: null,
      splashPrimaryAction: null,
      disconnectedLogin: null,
      splashSignInLabel: 'Sign in',
      oauthErrorDetail: null,
      editorBootstrapInFlight: false,
    };
  }
  return {
    oauthGateEnabled: true,
    phase: 'checking',
    session: null,
    splashPrimaryAction: null,
    disconnectedLogin: null,
    splashSignInLabel: 'Sign in',
    oauthErrorDetail: null,
    editorBootstrapInFlight: false,
  };
}

/** Maps to {@link ../components/ui/display/AppSplashScreen.svelte} `audiotoolPhase`. */
export function audiotoolSplashAudiotoolPhase(state: AudiotoolConnectionState): 'checking' | 'signin' {
  return state.phase === 'checking' ? 'checking' : 'signin';
}

export function reduceAudiotoolConnection(
  prev: AudiotoolConnectionState,
  event: AudiotoolConnectionEvent
): AudiotoolConnectionState {
  switch (event.type) {
    case 'AUTH_CHECKING':
      return prev.oauthGateEnabled
        ? {
            ...prev,
            phase: 'checking',
            session: null,
            splashPrimaryAction: null,
            disconnectedLogin: null,
            oauthErrorDetail: null,
            splashSignInLabel: 'Sign in',
          }
        : prev;

    case 'AUTH_UNAUTHENTICATED': {
      if (!prev.oauthGateEnabled) return prev;
      const login = event.login;
      return {
        ...prev,
        phase: 'disconnected',
        session: null,
        splashPrimaryAction: login,
        disconnectedLogin: login,
        oauthErrorDetail: event.oauthErrorDetail,
        splashSignInLabel: 'Sign in',
      };
    }

    case 'AUTH_CONNECTED':
      return prev.oauthGateEnabled
        ? {
            ...prev,
            phase: 'connected',
            session: event.session,
            splashPrimaryAction: null,
            disconnectedLogin: null,
            oauthErrorDetail: null,
            splashSignInLabel: 'Sign in',
          }
        : prev;

    case 'AUTH_INIT_FAILED':
      return prev.oauthGateEnabled
        ? {
            ...prev,
            phase: 'init_error',
            session: null,
            splashPrimaryAction: event.retryReload,
            disconnectedLogin: null,
            oauthErrorDetail: event.message,
            splashSignInLabel: 'Retry',
          }
        : prev;

    case 'LOGOUT_AND_CLEAR_SESSION':
    case 'SESSION_INVALIDATED_BY_SERVER': {
      if (!prev.oauthGateEnabled) return { ...prev, session: null };
      return {
        ...prev,
        phase: 'disconnected',
        session: null,
        splashPrimaryAction: null,
        disconnectedLogin: null,
        oauthErrorDetail: null,
        splashSignInLabel: 'Sign in',
      };
    }

    case 'DISCONNECTED_LOGIN_RESTORED':
      return prev.oauthGateEnabled ? { ...prev, disconnectedLogin: event.login } : prev;

    case 'BOOTSTRAP_IN_FLIGHT':
      return {
        ...prev,
        editorBootstrapInFlight: event.inFlight,
      };

    default: {
      const _never: never = event;
      return _never;
    }
  }
}
