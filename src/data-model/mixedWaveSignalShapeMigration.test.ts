import { describe, it, expect } from 'vitest';
import { migrateMixedWaveSignalShapes } from './mixedWaveSignalShapeMigration';
import type { NodeGraph } from './types';

describe('migrateMixedWaveSignalShapes', () => {
  it('maps w*Cosine to w*Shape and removes legacy keys', () => {
    const graph: NodeGraph = {
      id: 'g',
      name: 't',
      version: '2.0',
      nodes: [
        {
          id: 'n1',
          type: 'mixed-wave-signal',
          position: { x: 0, y: 0 },
          parameters: {
            w0Cosine: 1,
            w1Cosine: 0,
            w2Cosine: 0,
          },
        },
      ],
      connections: [],
    };

    const out = migrateMixedWaveSignalShapes(graph);
    const p = out.nodes[0]!.parameters as Record<string, number>;
    expect(p.w0Shape).toBe(1);
    expect(p.w1Shape).toBe(0);
    expect(p.w2Shape).toBe(0);
    expect('w0Cosine' in p).toBe(false);
  });

  it('leaves w*Shape when already present', () => {
    const graph: NodeGraph = {
      id: 'g',
      name: 't',
      version: '2.0',
      nodes: [
        {
          id: 'n1',
          type: 'mixed-wave-signal',
          position: { x: 0, y: 0 },
          parameters: { w0Shape: 3, w0Cosine: 1 },
        },
      ],
      connections: [],
    };

    const out = migrateMixedWaveSignalShapes(graph);
    const p = out.nodes[0]!.parameters as Record<string, number>;
    expect(p.w0Shape).toBe(3);
    expect('w0Cosine' in p).toBe(false);
  });
});
