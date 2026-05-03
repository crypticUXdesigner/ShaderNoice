import { audiotool, type BrowserAuthResult } from '@audiotool/nexus';
import { oauthRedirectBaseOrigin } from './loopbackRedirect';

/**
 * ShaderNoice app registration (public OAuth client id — not a secret).
 * Override with `VITE_AUDIOTOOL_CLIENT_ID` for forks; disable gate with `VITE_AUDIOTOOL_OAUTH_DISABLED=true`.
 */
export const BUILTIN_AUDIOTOOL_CLIENT_ID = '36bb416e-ced3-4da8-9a0e-cf15953a8299';

export function getAudiotoolOAuthClientId(): string {
  const fromEnv = import.meta.env.VITE_AUDIOTOOL_CLIENT_ID?.trim();
  return fromEnv?.length ? fromEnv : BUILTIN_AUDIOTOOL_CLIENT_ID;
}

/** True when the Audiotool sign-in gate and account UI should run (default: on, using built-in client id). */
export function isAudiotoolOAuthConfigured(): boolean {
  if (import.meta.env.VITE_AUDIOTOOL_OAUTH_DISABLED === 'true') {
    return false;
  }
  return getAudiotoolOAuthClientId().length > 0;
}

/**
 * OAuth redirect URL registered at https://developer.audiotool.com/applications —
 * must match **exactly** (scheme, host, port, path, trailing slash).
 *
 * Audiotool does **not** allow `localhost` in redirect URIs — loopback must be `127.0.0.1` or `[::1]`.
 * We normalize to `127.0.0.1` and redirect the browser from `localhost` at startup (see `main.ts`).
 *
 * Override with `VITE_AUDIOTOOL_REDIRECT_URI` when your registered URI must differ (do not use `localhost`).
 */
export function getAudiotoolOAuthRedirectUrl(): string {
  const fromEnv = import.meta.env.VITE_AUDIOTOOL_REDIRECT_URI?.trim();
  if (fromEnv?.length) {
    return fromEnv;
  }
  const basePath = import.meta.env.BASE_URL;
  const normalized = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return new URL(normalized, oauthRedirectBaseOrigin()).href;
}

/**
 * URIs to register at https://developer.audiotool.com/applications (Redirect URIs).
 * Local dev: register `http://127.0.0.1:<port>/ShaderNoice/` (see splash / dev console).
 */
export function getAudiotoolOAuthRedirectRegistrations(): readonly string[] {
  const fromEnv = import.meta.env.VITE_AUDIOTOOL_REDIRECT_URI?.trim();
  if (fromEnv?.length) {
    return [fromEnv];
  }
  if (typeof window === 'undefined') {
    return [];
  }
  return [getAudiotoolOAuthRedirectUrl()];
}

/**
 * OAuth scope must be a subset of scopes enabled for the app at developer.audiotool.com.
 * Default **`user:read project:read`**: identity plus listing published tracks via `ProjectService`
 * (`listProjects` rejects without `project:read`). Portal “enabled scopes” are not applied automatically —
 * whatever we pass here is what the authorization request asks for. Override with
 * `VITE_AUDIOTOOL_OAUTH_SCOPE` for forks/minimal registrations (multiple scopes: space-separated).
 *
 * **Session expiry / reconnect:** `@audiotool/nexus` owns token refresh inside an authenticated browser
 * session. If the SDK leaves the session invalid, the UI should expose sign-in again (splash or top bar);
 * ShaderNoice clears the Nexus client on explicit sign-out. There is no separate “silent reconnect”
 * loop in this app besides what the SDK performs—see IMPLEMENTATION_PLAN Phase C3.
 */
export function getAudiotoolOAuthScope(): string {
  const s = import.meta.env.VITE_AUDIOTOOL_OAUTH_SCOPE?.trim();
  return s?.length ? s : 'user:read project:read';
}

export async function initAudiotoolBrowserAuth(): Promise<BrowserAuthResult> {
  const clientId = getAudiotoolOAuthClientId();
  const redirectUrl = getAudiotoolOAuthRedirectUrl();
  if (import.meta.env.DEV) {
    console.info(
      '[ShaderNoice] Audiotool OAuth redirectUrl (must match developer.audiotool.com app settings):',
      redirectUrl
    );
  }
  return audiotool({
    clientId,
    redirectUrl,
    scope: getAudiotoolOAuthScope(),
  });
}
