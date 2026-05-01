import { describe, expect, it } from 'vitest';
import type { NodeGraph } from '../../../data-model/types';
import type { NodeSpec } from '../../../types/nodeSpec';
import { resolveCurveEditorRegion } from './curveEditorRegionContext';

const floatParamSpec: NodeSpec = {
  id: 'n1',
  displayName: 'Test',
  category: 'math',
  parameters: {
    amount: { type: 'float', label: 'Amount', min: 0, max: 10, default: 0 },
  },
  inputs: {},
  outputs: {},
};

function minimalGraph(overrides: Partial<NodeGraph> = {}): NodeGraph {
  return {
    id: 'g1',
    name: 'G',
    version: '2.0',
    nodes: [
      {
        id: 'node-a',
        type: 'n1',
        position: { x: 0, y: 0 },
        parameters: { amount: 5 },
      },
    ],
    connections: [],
    automation: {
      bpm: 120,
      durationSeconds: 32,
      lanes: [
        {
          id: 'lane-1',
          nodeId: 'node-a',
          paramName: 'amount',
          regions: [
            {
              id: 'reg-1',
              startTime: 0,
              duration: 4,
              loop: false,
              curve: {
                keyframes: [
                  { time: 0, value: 0.5 },
                  { time: 1, value: 0.5 },
                ],
                interpolation: 'linear',
              },
            },
          ],
        },
      ],
    },
    ...overrides,
  };
}

describe('resolveCurveEditorRegion', () => {
  it('resolves parameter range from node spec', () => {
    const map = new Map<string, NodeSpec>([['n1', floatParamSpec]]);
    const r = resolveCurveEditorRegion(minimalGraph(), 'lane-1', 'reg-1', map);
    expect(r.paramRange.min).toBe(0);
    expect(r.paramRange.max).toBe(10);
    expect(r.regionBars).toBeGreaterThan(0);
    expect(r.regionTimeRange?.startTime).toBe(0);
  });

  it('returns defaults when lane missing', () => {
    const map = new Map<string, NodeSpec>();
    const r = resolveCurveEditorRegion(minimalGraph(), 'x', 'y', map);
    expect(r.lane).toBeNull();
    expect(r.paramRange.min).toBe(0);
    expect(r.paramRange.max).toBe(1);
    expect(r.categorySlug).toBe('default');
  });
});
