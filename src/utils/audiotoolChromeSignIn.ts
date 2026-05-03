/**
 * Pure policy for "Sign in to Audiotool" in the chrome when OAuth is configured
 * but there is no active session (see docs/projects/audiotool-optional-connection/IMPLEMENTATION_PLAN.md §4).
 */

export interface AudiotoolSignInChromeInput {
  useAudiotoolGate: boolean;
  splashOverlayVisible: boolean;
  hasAudiotoolSession: boolean;
  login: (() => void) | null | undefined;
}

/** Returns null when the disconnected sign-in control must not appear. */
export function resolveAudiotoolSignInChromeAction(
  o: AudiotoolSignInChromeInput
): (() => void) | null {
  const fn = o.login;
  if (!o.useAudiotoolGate || o.splashOverlayVisible || o.hasAudiotoolSession || fn == null) {
    return null;
  }
  return () => fn();
}
