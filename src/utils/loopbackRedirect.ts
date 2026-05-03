/**
 * Audiotool OAuth rejects `localhost` in registered redirect URIs (use 127.0.0.1 or [::1]).
 * PKCE `code_verifier` is stored in localStorage per-origin, so the app must use the same
 * host for the whole sign-in flow — redirect early from localhost / IPv6 loopback to 127.0.0.1.
 */

const LOOPBACK_IPV4 = '127.0.0.1';

function isLoopbackHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '[::1]' || hostname === '::1';
}

/** Origin used when building OAuth `redirect_uri` (never `localhost`). */
export function oauthRedirectBaseOrigin(): string {
  if (typeof window === 'undefined') {
    return `http://${LOOPBACK_IPV4}`;
  }
  const u = new URL(window.location.href);
  if (isLoopbackHostname(u.hostname)) {
    u.hostname = LOOPBACK_IPV4;
  }
  return u.origin;
}

/**
 * If the page was opened as `http://localhost:...` or `http://[::1]:...`, replace the location
 * with the same path on `http://127.0.0.1:...` before the app boots (OAuth + storage alignment).
 */
export function redirectLoopbackHostnameToIPv4(): void {
  if (typeof window === 'undefined') return;
  const { hostname, href } = window.location;
  if (!isLoopbackHostname(hostname)) return;
  const u = new URL(href);
  u.hostname = LOOPBACK_IPV4;
  if (u.href !== href) {
    window.location.replace(u.href);
  }
}
