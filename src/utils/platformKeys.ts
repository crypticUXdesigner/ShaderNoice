/**
 * Platform-aware labels for keyboard shortcut UI (Option vs Alt, etc.).
 */

export function isMacLikeUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  const p = navigator.platform ?? '';
  const ua = navigator.userAgent ?? '';
  return /Mac|iPhone|iPad|iPod/i.test(p) || /Mac OS X/.test(ua);
}

/** Single keycap for the Option / Alt modifier (menus, shortcuts). */
export function altOptionKeycapLabel(): string {
  return isMacLikeUserAgent() ? '⌥' : 'Alt';
}
