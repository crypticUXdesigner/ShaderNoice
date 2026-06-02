import { UV_WARP_CIRCLE_INVERSION_EPS_SQ } from './constants';

export type Vec2 = readonly [number, number];

/**
 * Circle inversion in UV space: `center + p * (r² / max(dot(p,p), eps))`, blended toward
 * identity by `strength` in `[0, 1]`.
 */
export function circleInversionUv(
  z: Vec2,
  center: Vec2,
  radius: number,
  strength: number
): [number, number] {
  const px = z[0] - center[0];
  const py = z[1] - center[1];
  const rSq = radius * radius;
  const dotPP = Math.max(px * px + py * py, UV_WARP_CIRCLE_INVERSION_EPS_SQ);
  const invX = center[0] + px * (rSq / dotPP);
  const invY = center[1] + py * (rSq / dotPP);
  const t = Math.max(0, Math.min(1, strength));
  return [z[0] + (invX - z[0]) * t, z[1] + (invY - z[1]) * t];
}

export function emitCircleInversionGlsl(): string {
  return `
vec2 uvWarp_circleInversionUv(vec2 z, vec2 center, float radius, float strength) {
  vec2 p = z - center;
  float rSq = radius * radius;
  float dotPP = max(dot(p, p), ${UV_WARP_CIRCLE_INVERSION_EPS_SQ});
  vec2 inverted = center + p * (rSq / dotPP);
  return mix(z, inverted, clamp(strength, 0.0, 1.0));
}
`.trim();
}

export function emitCircleInversionWgsl(): string {
  return `
fn uvWarp_circleInversionUv(z: vec2<f32>, center: vec2<f32>, radius: f32, strength: f32) -> vec2<f32> {
  let p = z - center;
  let rSq = radius * radius;
  let dotPP = max(dot(p, p), ${UV_WARP_CIRCLE_INVERSION_EPS_SQ});
  let inverted = center + p * (rSq / dotPP);
  return mix(z, inverted, clamp(strength, 0.0, 1.0));
}
`.trim();
}
