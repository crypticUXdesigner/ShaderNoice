/**
 * Reads a CSS time token from `:root` (or `el`) and returns milliseconds.
 *
 * Supports values like `150ms`, `0.15s`, and unitless numbers (treated as ms).
 */
export function readCssTimeMs(varName: string, el: Element | null = null): number {
  if (typeof window === 'undefined') return Number.NaN;

  const target = el ?? document.documentElement;
  const raw = getComputedStyle(target).getPropertyValue(varName).trim();
  if (!raw) return Number.NaN;

  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return Number.NaN;

  if (raw.endsWith('ms')) return Math.round(n);
  if (raw.endsWith('s')) return Math.round(n * 1000);

  // Unitless: treat as ms (useful if you ever store `150` instead of `150ms`)
  return Math.round(n);
}
