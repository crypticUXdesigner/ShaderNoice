import type { AutomationKeyframe } from '../../../data-model/types';

/** Keeps sequential keyframes from sharing the same normalized time during drag corrections. */
export const KEYFRAME_TIME_EPS = 1e-3;

/** Only snap when the pointer is near a grid crossing (fraction of one grid step). */
export const SNAP_NEAR_GRID_FRAC = 0.36;

export const SNAP_DIVISIONS = [1, 2, 4, 8, 16] as const;
export type SnapDivision = (typeof SNAP_DIVISIONS)[number];

/** Hard snap reference (nearest grid crossing). Snap is “soft”: only pulls when pointer is close. */
export function snapTimeToBarGrid(t: number, regionBars: number, division: number): number {
  if (regionBars <= 0 || division <= 0) return t;
  const step = 1 / (regionBars * division);
  const n = Math.round(t / step);
  return Math.max(0, Math.min(1, n * step));
}

export function stableTimeSortKeyframes(keyframes: AutomationKeyframe[]): {
  sorted: AutomationKeyframe[];
  oldToNew: Map<number, number>;
} {
  const withIdx = keyframes.map((kf, idx) => ({ kf: { ...kf }, idx }));
  withIdx.sort((a, b) =>
    a.kf.time !== b.kf.time ? a.kf.time - b.kf.time : a.idx - b.idx
  );
  const sorted = withIdx.map((x) => x.kf);
  const oldToNew = new Map<number, number>(
    withIdx.map((row, slot) => [row.idx, slot])
  );
  return { sorted, oldToNew };
}

export function remapSelectionIndices(
  indices: readonly number[],
  oldToNew: Map<number, number>
): number[] {
  const next = new Set<number>();
  for (const i of indices) {
    const mapped = oldToNew.get(i);
    if (mapped !== undefined) next.add(mapped);
  }
  return [...next].sort((a, b) => a - b);
}

/** Preserve time order along the array (sorted keyframe semantics) without resorting indices mid-drag. */
export function enforceMonotonicKeyTimes_inplace(kfs: AutomationKeyframe[]): void {
  const n = kfs.length;
  if (n < 2) return;

  let changed = true;
  let guard = 0;
  while (changed && guard < 32) {
    changed = false;
    guard += 1;
    kfs[0] = { ...kfs[0], time: 0 };
    kfs[n - 1] = { ...kfs[n - 1], time: 1 };

    for (let i = 1; i < n - 1; i += 1) {
      const minT = Math.min(kfs[i - 1].time + KEYFRAME_TIME_EPS, 1);
      if (kfs[i].time < minT) {
        kfs[i] = { ...kfs[i], time: minT };
        changed = true;
      }
    }
    for (let i = n - 2; i >= 1; i -= 1) {
      const maxT = Math.max(kfs[i + 1].time - KEYFRAME_TIME_EPS, 0);
      if (kfs[i].time > maxT) {
        kfs[i] = { ...kfs[i], time: maxT };
        changed = true;
      }
    }
  }
  kfs[0] = { ...kfs[0], time: 0 };
  kfs[n - 1] = { ...kfs[n - 1], time: 1 };
}

export function proposeDragKeyframes(
  base: AutomationKeyframe[],
  selIndices: readonly number[],
  anchorT: number,
  anchorV: number,
  pointerT: number,
  pointerV: number,
  snapTimeFn: (t: number) => number
): AutomationKeyframe[] {
  const dt = pointerT - anchorT;
  const dv = pointerV - anchorV;
  const n = base.length;
  const selSet = new Set(selIndices);

  const next = base.map((kf, i) => {
    if (!selSet.has(i)) return { ...kf };

    const nv = Math.max(0, Math.min(1, kf.value + dv));
    let nt: number;

    if (i === 0) {
      return { time: 0, value: nv };
    }
    if (i === n - 1) {
      return { time: 1, value: nv };
    }

    nt = snapTimeFn(kf.time + dt);
    nt = Math.max(0, Math.min(1, nt));
    return { time: nt, value: nv };
  });

  enforceMonotonicKeyTimes_inplace(next);
  return next;
}

export type CurveEditorDragSession = {
  startKeyframes: AutomationKeyframe[];
  selectedIndicesSorted: readonly number[];
  anchorT: number;
  anchorV: number;
};

/**
 * Time-only snapping: quantize only near a grid crossing (less “magnetic” than full quantize).
 */
export function maybeSnapCurveKeyframeTime(
  t: number,
  opts: { snapEnabled: boolean; regionBars: number; snapDivision: number }
): number {
  const tn = Math.max(0, Math.min(1, t));
  if (!opts.snapEnabled) return tn;
  if (opts.regionBars <= 0 || opts.snapDivision <= 0) return tn;
  const step = 1 / (opts.regionBars * opts.snapDivision);
  const snapped = snapTimeToBarGrid(tn, opts.regionBars, opts.snapDivision);
  return Math.abs(tn - snapped) <= step * SNAP_NEAR_GRID_FRAC ? snapped : tn;
}

/** After inserting a keyframe near (t,v), locate its index for selection. */
export function indexOfInsertedKeyframe(
  sorted: AutomationKeyframe[],
  t: number,
  v: number
): number {
  const TIME_TOL = 2e-4;
  const VAL_TOL = 2e-4;
  for (let i = 0; i < sorted.length; i++) {
    const k = sorted[i]!;
    if (Math.abs(k.time - t) < TIME_TOL && Math.abs(k.value - v) < VAL_TOL) return i;
  }
  let best = 0;
  let bestDt = Infinity;
  for (let i = 0; i < sorted.length; i++) {
    const dt = Math.abs(sorted[i]!.time - t);
    if (dt < bestDt) {
      bestDt = dt;
      best = i;
    }
  }
  return best;
}
