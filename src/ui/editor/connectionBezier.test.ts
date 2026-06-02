import { describe, expect, it } from 'vitest';
import {
  computeConnectionBezierControlPoints,
  connectionPreviewMarchForward,
  previewTargetPortSide,
} from './connectionBezier';

describe('connectionBezier', () => {
  it('extends tangents horizontally from port sides for a normal left-to-right wire', () => {
    const { cp1, cp2 } = computeConnectionBezierControlPoints(
      { x: 0, y: 0 },
      { x: 300, y: 0 },
      'right',
      'left'
    );
    expect(cp1.x).toBeGreaterThan(0);
    expect(cp1.y).toBe(0);
    expect(cp2.x).toBeLessThan(300);
    expect(cp2.y).toBe(0);
  });

  it('increases tangent when the target is behind the source', () => {
    const forward = computeConnectionBezierControlPoints(
      { x: 300, y: 100 },
      { x: 500, y: 100 },
      'right',
      'left'
    );
    const backward = computeConnectionBezierControlPoints(
      { x: 500, y: 100 },
      { x: 300, y: 100 },
      'right',
      'left'
    );
    const forwardSpan = forward.cp1.x - 300;
    const backwardSpan = 500 - backward.cp2.x;
    expect(backwardSpan).toBeGreaterThan(forwardSpan);
  });

  it('maps preview endpoint sides from drag origin', () => {
    expect(previewTargetPortSide(true)).toBe('left');
    expect(previewTargetPortSide(false)).toBe('right');
    expect(connectionPreviewMarchForward(true)).toBe(true);
    expect(connectionPreviewMarchForward(false)).toBe(false);
  });
});
