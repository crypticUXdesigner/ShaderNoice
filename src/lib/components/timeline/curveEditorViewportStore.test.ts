import { describe, expect, it } from 'vitest';
import {
  clearCurveEditorViewportStoreForTests,
  curveEditorViewportKey,
  readCurveEditorViewport,
  writeCurveEditorViewport,
} from './curveEditorViewportStore';
import { CURVE_EDITOR_DEFAULT_TIME_VIEWPORT } from './curveEditorGeometry';

describe('curveEditorViewportStore', () => {
  it('returns default until a viewport is written', () => {
    clearCurveEditorViewportStoreForTests();
    const key = curveEditorViewportKey('lane-a', 'region-b');
    expect(readCurveEditorViewport(key)).toEqual(CURVE_EDITOR_DEFAULT_TIME_VIEWPORT);
  });

  it('round-trips a stored viewport per lane/region key', () => {
    clearCurveEditorViewportStoreForTests();
    const key = curveEditorViewportKey('lane-a', 'region-b');
    writeCurveEditorViewport(key, { start: 0.2, span: 0.4 });
    expect(readCurveEditorViewport(key)).toEqual({ start: 0.2, span: 0.4 });
  });
});
