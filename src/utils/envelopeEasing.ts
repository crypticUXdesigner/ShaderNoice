/**
 * Per-phase ADSR easing — closed-form curves for normalized phase time t ∈ [0, 1].
 * Shared by runtime evaluation and envelope editor SVG sampling (task 02).
 */

export type EnvelopeCurve = 'linear' | 'exponential' | 'logarithmic' | 'smooth';

export const ENVELOPE_CURVES: readonly EnvelopeCurve[] = [
  'linear',
  'exponential',
  'logarithmic',
  'smooth',
] as const;

const CURVE_EXPONENT = 4;

/** 16×16 viewBox for envelope curve preset glyphs (attack-style: time →, level ↑). */
export const ENVELOPE_CURVE_ICON_VIEW_SIZE = 16;

/**
 * Curve preset icon paths from Figma (file cyMaCAaSANXdGWv4c5MqDO, nodes 131:8–131:14).
 * Normalized from 64×64 drawable in 80×80 frames; stroke uses currentColor in UI.
 */
export const ENVELOPE_CURVE_ICON_PATHS: Record<EnvelopeCurve, string> = {
  linear: 'M 0.50 14.50 L 14.50 0.50',
  exponential: 'M 0.50 14.50 C 12.97 14.50, 14.50 5.31, 14.50 0.50',
  logarithmic: 'M 0.50 14.50 C 0.50 5.31, 2.03 0.50, 14.50 0.50',
  smooth: 'M 0.50 14.50 C 9.69 14.50, 5.31 0.50, 14.50 0.50',
};

/** SVG path `d` for a curve preset icon (bottom-left → top-right). */
export function buildEnvelopeCurveIconPathD(curve: EnvelopeCurve): string {
  return ENVELOPE_CURVE_ICON_PATHS[curve];
}

export function isEnvelopeCurve(value: unknown): value is EnvelopeCurve {
  return typeof value === 'string' && (ENVELOPE_CURVES as readonly string[]).includes(value);
}

/**
 * Map normalized phase progress through a curve preset.
 * - `linear` — identity
 * - `exponential` — concave rise (slow start → fast finish); `t^k`
 * - `logarithmic` — convex progress (fast start → slow tail); `t^(1/k)`
 * - `smooth` — smoothstep `t²(3−2t)`
 */
export function applyEnvelopeCurve(t: number, curve: EnvelopeCurve): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (curve) {
    case 'linear':
      return clamped;
    case 'exponential': {
      if (clamped >= 1) return 1;
      if (clamped <= 0) return 0;
      return Math.pow(clamped, CURVE_EXPONENT);
    }
    case 'logarithmic': {
      if (clamped >= 1) return 1;
      if (clamped <= 0) return 0;
      return Math.pow(clamped, 1 / CURVE_EXPONENT);
    }
    case 'smooth':
      return clamped * clamped * (3 - 2 * clamped);
    default: {
      const _exhaustive: never = curve;
      return _exhaustive;
    }
  }
}
