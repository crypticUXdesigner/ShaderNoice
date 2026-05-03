/**
 * CSS cursor for Add tool (and Alt+Cursor on empty canvas): Phosphor-style plus-square as data-URI.
 */
import { createIconElement } from '../../../utils/icons';

let cached: string | null = null;

/** Full `cursor` CSS value: custom icon with hotspot, then fallback. */
export function getAddToolAltCursorValue(): string {
  if (typeof document === 'undefined') return 'crosshair';
  if (cached) return cached;
  try {
    const svg = createIconElement('plus-square', 32, '#f2f2f2', undefined, 'line');
    svg.setAttribute('width', '32');
    svg.setAttribute('height', '32');
    const encoded = encodeURIComponent(svg.outerHTML);
    cached = `url("data:image/svg+xml;charset=utf-8,${encoded}") 16 16, crosshair`;
    return cached;
  } catch {
    return 'crosshair';
  }
}
