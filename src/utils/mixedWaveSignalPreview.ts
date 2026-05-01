/**
 * CPU-side preview of mixed-wave-signal output for parameter UI live values.
 * Must stay in sync with `mwsMixedWaveShape` + mainCode in `mixed-wave-signal.ts`
 * and with App.svelte uTime: `(performance.now() / 1000) % 1000`.
 */

import type { NodeInstance } from '../data-model/types';
import { mixedWaveSignalNodeSpec } from '../shaders/nodes/mixed-wave-signal';

function glslFract(x: number): number {
  return x - Math.floor(x);
}

function mwsMixedWaveShapeJs(p: number, shape: number): number {
  const twoPi = 6.28318530718;
  const pi = 3.14159265359;
  if (shape === 0) return Math.sin(p);
  if (shape === 1) return Math.cos(p);
  if (shape === 2) return Math.sign(Math.sin(p));
  if (shape === 3) return Math.asin(Math.sin(p)) * (2.0 / pi);
  if (shape === 4) return 2.0 * glslFract(p / twoPi) - 1.0;
  if (shape === 5) return 1.0 - 2.0 * glslFract(p / twoPi);
  if (shape === 6) return 2.0 * Math.abs(Math.sin(p)) - 1.0;
  if (shape === 7) {
    const x = Math.sin(p);
    const edge0 = -0.999;
    const edge1 = 0.999;
    const denom = edge1 - edge0;
    const t = denom !== 0 ? Math.max(0, Math.min(1, (x - edge0) / denom)) : 0;
    const s = t * t * (3.0 - 2.0 * t);
    return s * 2.0 - 1.0;
  }
  return Math.sin(p);
}

function paramNum(
  node: NodeInstance,
  key: string,
  fallback: number
): number {
  const spec = mixedWaveSignalNodeSpec.parameters[key];
  const def = typeof spec?.default === 'number' ? spec.default : fallback;
  const v = node.parameters[key];
  return typeof v === 'number' && !isNaN(v) ? v : def;
}

function paramShape(node: NodeInstance, key: string): number {
  const spec = mixedWaveSignalNodeSpec.parameters[key];
  const def = typeof spec?.default === 'number' ? Math.round(spec.default) : 0;
  const v = node.parameters[key];
  const r = typeof v === 'number' && !isNaN(v) ? Math.round(v) : def;
  return Math.max(0, Math.min(7, r));
}

/**
 * Same time base as shader uTime (see App.svelte animation loop).
 */
export function getShaderTimeSeconds(): number {
  return (performance.now() / 1000) % 1000.0;
}

export function evaluateMixedWaveSignalPreview(node: NodeInstance): number {
  const tSec = getShaderTimeSeconds();
  const globalSpeed = paramNum(node, 'globalSpeed', 1);
  const globalOffset = paramNum(node, 'globalOffset', 0);
  const tBase = tSec * globalSpeed + globalOffset;

  const p0 = tBase * paramNum(node, 'w0Speed', 1) + paramNum(node, 'w0Offset', 0);
  const p1 = tBase * paramNum(node, 'w1Speed', 0.73) + paramNum(node, 'w1Offset', 2.17);
  const p2 = tBase * paramNum(node, 'w2Speed', 1.31) + paramNum(node, 'w2Offset', 4.03);

  const s0 = mwsMixedWaveShapeJs(p0, paramShape(node, 'w0Shape'));
  const s1 = mwsMixedWaveShapeJs(p1, paramShape(node, 'w1Shape'));
  const s2 = mwsMixedWaveShapeJs(p2, paramShape(node, 'w2Shape'));

  const w0 = paramNum(node, 'w0Weight', 1);
  const w1 = paramNum(node, 'w1Weight', 1);
  const w2 = paramNum(node, 'w2Weight', 1);
  const wsum = w0 + w1 + w2 + 1e-6;
  const combined = (w0 * s0 + w1 * s1 + w2 * s2) / wsum;
  const u = combined * 0.5 + 0.5;
  const outMin = paramNum(node, 'outMin', -1);
  const outMax = paramNum(node, 'outMax', 1);
  return outMin + u * (outMax - outMin);
}
