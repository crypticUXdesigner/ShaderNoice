/**
 * JS-side evaluation of timeline automation at a given time.
 * Used by UI (effective parameter values) and mirrored in GLSL (lane-wide extrapolation).
 */

import type {
  NodeGraph,
  NodeInstance,
  AutomationState,
  AutomationLane,
  AutomationRegion,
  AutomationCurve,
  AutomationKeyframe,
} from '../data-model/types';
import type { ParameterSpec } from '../types/nodeSpec';

/** Result of finding a region at time t: region and normalized local time in [0, 1]. */
export interface RegionAtTime {
  region: AutomationRegion;
  normalizedTime: number;
}

/**
 * Evaluate a curve at normalized time s in [0, 1].
 * Keyframes are sorted by time; segment is found; value is computed by interpolation.
 * Returns raw value (may be outside [0,1] if keyframe values are). Caller scales by param min/max.
 */
export function evaluateCurveAtNormalizedTime(curve: AutomationCurve, s: number): number {
  const keyframes = [...(curve.keyframes ?? [])].sort((a, b) => a.time - b.time);
  if (keyframes.length === 0) return 0;
  if (keyframes.length === 1) return keyframes[0].value;

  const n = keyframes.length;
  // Clamp s to [0, 1] for segment lookup
  const t = Math.max(0, Math.min(1, s));

  // Find segment: keyframes[i].time <= t < keyframes[i+1].time
  let i = 0;
  for (; i < n - 1; i++) {
    if (t < keyframes[i + 1].time) break;
  }
  if (i >= n - 1) {
    return keyframes[n - 1].value;
  }

  const k0 = keyframes[i];
  const k1 = keyframes[i + 1];
  const segDuration = k1.time - k0.time;
  const segT = segDuration > 0 ? (t - k0.time) / segDuration : 0;

  switch (curve.interpolation) {
    case 'stepped':
      return k0.value;
    case 'linear':
      return k0.value + segT * (k1.value - k0.value);
    case 'bezier': {
      const m0 = tangentAtKeyframe(keyframes, i, n);
      const m1 = tangentAtKeyframe(keyframes, i + 1, n);
      return cubicHermite(segT, k0.value, m0 * segDuration, k1.value, m1 * segDuration);
    }
    default:
      return k0.value + segT * (k1.value - k0.value);
  }
}

/** Tangent at keyframe i for cubic Hermite (finite difference). */
function tangentAtKeyframe(keyframes: AutomationKeyframe[], i: number, n: number): number {
  if (n <= 1) return 0;
  if (i <= 0) return (keyframes[1].value - keyframes[0].value) / (keyframes[1].time - keyframes[0].time || 1);
  if (i >= n - 1) return (keyframes[n - 1].value - keyframes[n - 2].value) / (keyframes[n - 1].time - keyframes[n - 2].time || 1);
  const dt = keyframes[i + 1].time - keyframes[i - 1].time;
  const dv = keyframes[i + 1].value - keyframes[i - 1].value;
  return dt !== 0 ? dv / dt : 0;
}

/** Cubic Hermite: p0, m0 at t=0; p1, m1 at t=1. */
function cubicHermite(t: number, p0: number, m0: number, p1: number, m1: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
}

/** Region contributes to automation: positive duration and at least one keyframe. */
export function isEvaluableRegion(region: AutomationRegion): boolean {
  if (region.duration <= 0) return false;
  return (region.curve?.keyframes?.length ?? 0) > 0;
}

/** Sort evaluable regions by start time, then region id (matches validation / GLSL). */
export function sortEvaluableRegions(lane: AutomationLane): AutomationRegion[] {
  return lane.regions.filter(isEvaluableRegion).sort((a, b) => {
    if (a.startTime !== b.startTime) return a.startTime - b.startTime;
    return a.id.localeCompare(b.id);
  });
}

/** True if the lane has at least one evaluable region (automation is active on the timeline). */
export function automationLaneHasEvaluableRegions(lane: AutomationLane): boolean {
  return lane.regions.some(isEvaluableRegion);
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** `mod` consistent with GLSL for positive divisor (result in [0, b)). */
export function floatMod(a: number, b: number): number {
  if (b <= 0) return 0;
  return a - b * Math.floor(a / b);
}

/** Scale raw curve sample to parameter range. */
export function scaleCurveToParamRange(
  region: AutomationRegion,
  s: number,
  paramSpec?: ParameterSpec
): number {
  const raw = evaluateCurveAtNormalizedTime(region.curve, s);
  const min = paramSpec?.min ?? 0;
  const max = paramSpec?.max ?? 1;
  const value = min + raw * (max - min);
  return Math.max(min, Math.min(max, value));
}

/**
 * Lane-wide automation value at time t (lead-in, hold, loop-until-next).
 * @param regions — evaluable regions, sorted (use {@link sortEvaluableRegions}).
 */
export function evaluateLaneAutomationAtTime(
  regions: AutomationRegion[],
  t: number,
  paramSpec?: ParameterSpec
): number | null {
  if (regions.length === 0) return null;

  if (t < regions[0].startTime) {
    return scaleCurveToParamRange(regions[0], 0, paramSpec);
  }

  const n = regions.length;

  for (let i = 0; i < n; i++) {
    const region = regions[i];
    const nextStart = i + 1 < n ? regions[i + 1].startTime : Infinity;

    if (region.loop) {
      if (t >= region.startTime && t < nextStart) {
        const local = floatMod(t - region.startTime, region.duration);
        const s = local / region.duration;
        return scaleCurveToParamRange(region, s, paramSpec);
      }
    } else {
      const end = region.startTime + region.duration;
      const insideEnd = Math.min(end, nextStart);
      if (t >= region.startTime && t < insideEnd) {
        const s = (t - region.startTime) / region.duration;
        return scaleCurveToParamRange(region, clamp01(s), paramSpec);
      }
      if (t >= end && t < nextStart) {
        return scaleCurveToParamRange(region, 1, paramSpec);
      }
    }
  }

  const last = regions[n - 1];
  if (last.loop) {
    const local = floatMod(t - last.startTime, last.duration);
    const s = local / last.duration;
    return scaleCurveToParamRange(last, s, paramSpec);
  }
  return scaleCurveToParamRange(last, 1, paramSpec);
}

/**
 * Find the lane for (nodeId, paramName) and the region whose curve **actively** drives t
 * (strict interior for non-loop; looping uses repeat-until-next-start, same as evaluation).
 */
export function findRegionAtTime(
  automation: AutomationState,
  nodeId: string,
  paramName: string,
  t: number
): RegionAtTime | null {
  const lane = automation.lanes.find(
    (l) => l.nodeId === nodeId && l.paramName === paramName
  );
  if (!lane) return null;

  const regions = sortEvaluableRegions(lane);
  const n = regions.length;
  if (n === 0) return null;

  for (let i = 0; i < n; i++) {
    const region = regions[i];
    const nextStart = i + 1 < n ? regions[i + 1].startTime : Infinity;
    const start = region.startTime;
    const duration = region.duration;
    const end = start + duration;

    if (region.loop) {
      if (t >= start && t < nextStart) {
        const localTime = floatMod(t - start, duration);
        return { region, normalizedTime: localTime / duration };
      }
    } else {
      const insideEnd = Math.min(end, nextStart);
      if (t >= start && t < insideEnd) {
        const localTime = t - start;
        return { region, normalizedTime: localTime / duration };
      }
    }
  }
  return null;
}

/**
 * Evaluate automation at time t for the given (nodeId, paramName).
 * Returns value in param range, or null if the lane is inactive (no evaluable regions).
 */
export function evaluateAutomationAtTime(
  graph: NodeGraph,
  nodeId: string,
  paramName: string,
  t: number,
  paramSpec?: ParameterSpec
): number | null {
  const automation = graph.automation;
  if (!automation?.lanes?.length) return null;

  const lane = automation.lanes.find(
    (l) => l.nodeId === nodeId && l.paramName === paramName
  );
  if (!lane) return null;

  const regions = sortEvaluableRegions(lane);
  return evaluateLaneAutomationAtTime(regions, t, paramSpec);
}

/**
 * Helper for the effective-parameter path: get automation value for a node's parameter at time t.
 * Returns number in param range or null.
 */
export function getAutomationValueForParam(
  node: NodeInstance,
  paramName: string,
  graph: NodeGraph,
  t: number,
  paramSpec?: ParameterSpec
): number | null {
  return evaluateAutomationAtTime(graph, node.id, paramName, t, paramSpec);
}
