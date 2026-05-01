import { describe, expect, it } from 'vitest';
import {
  maybeSnapCurveKeyframeTime,
  remapSelectionIndices,
  snapTimeToBarGrid,
  stableTimeSortKeyframes,
} from './curveEditorKeyframes';

describe('curveEditorKeyframes', () => {
  it('snapTimeToBarGrid quantizes to grid', () => {
    expect(snapTimeToBarGrid(0.51, 4, 1)).toBeCloseTo(0.5);
  });

  it('maybeSnapCurveKeyframeTime returns raw when snap disabled', () => {
    expect(
      maybeSnapCurveKeyframeTime(0.31, {
        snapEnabled: false,
        regionBars: 4,
        snapDivision: 1,
      })
    ).toBeCloseTo(0.31);
  });

  it('stableTimeSortKeyframes produces remap for selection', () => {
    const { sorted, oldToNew } = stableTimeSortKeyframes([
      { time: 0.6, value: 1 },
      { time: 0.2, value: 0 },
    ]);
    expect(sorted[0]!.time).toBeLessThan(sorted[1]!.time);
    expect(remapSelectionIndices([1, 0], oldToNew).sort()).toEqual([0, 1]);
  });
});
