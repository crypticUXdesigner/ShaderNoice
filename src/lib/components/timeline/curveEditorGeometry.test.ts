import { describe, expect, it } from 'vitest';
import {
  GRAPH_PADDING,
  curveClientToGraph,
  curveTimeToX,
  curveValueToY,
  curveXToTime,
  curveYToValue,
} from './curveEditorGeometry';

describe('curveEditorGeometry', () => {
  it('maps t=0 and t=1 to left and right inner edges', () => {
    const w = 200;
    const l = GRAPH_PADDING.left;
    const r = w - GRAPH_PADDING.right;
    expect(curveTimeToX(0, w)).toBeCloseTo(l, 5);
    expect(curveTimeToX(1, w)).toBeCloseTo(r, 5);
  });

  it('round-trips time through x (inner width > 0)', () => {
    const w = 300;
    expect(curveXToTime(curveTimeToX(0.37, w), w)).toBeCloseTo(0.37, 5);
  });

  it('maps client position through rect into normalized t/v', () => {
    const rect = { left: 100, top: 50, width: 100, height: 50 } as DOMRect;
    const graphWidth = 200;
    const graphHeight = 100;
    const g = curveClientToGraph(rect.left, rect.top, rect, graphWidth, graphHeight);
    expect(g.t).toBeCloseTo(0, 5);
    expect(g.v).toBeCloseTo(1, 5);

    const g2 = curveClientToGraph(200, 100, rect, graphWidth, graphHeight);
    expect(g2.t).toBeCloseTo(1, 5);
    expect(g2.v).toBeCloseTo(0, 5);
  });

  it('value maps v=0 and v=1 to bottom and top inner edges', () => {
    const h = 120;
    const top = GRAPH_PADDING.top;
    const bottom = h - GRAPH_PADDING.bottom;
    expect(curveValueToY(1, h)).toBeCloseTo(top, 5);
    expect(curveValueToY(0, h)).toBeCloseTo(bottom, 5);
    expect(curveYToValue(bottom, h)).toBeCloseTo(0, 5);
    expect(curveYToValue(top, h)).toBeCloseTo(1, 5);
  });
});
