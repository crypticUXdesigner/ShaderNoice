/**
 * Full-viewport intro splash: enabled in production builds, or in dev when
 * `VITE_SHOW_SPLASH=true` or the URL contains `?splash` (e.g. `?splash=1`).
 */
export function isAppSplashEnabled(): boolean {
  if (import.meta.env.PROD) {
    return true;
  }
  if (import.meta.env.VITE_SHOW_SPLASH === 'true') {
    return true;
  }
  if (typeof window !== 'undefined') {
    return new URLSearchParams(window.location.search).has('splash');
  }
  return false;
}
