import { describe, it, expect } from 'vitest';
import { migrateRemoveRegionContourRingsNodes } from './regionContourRingsRemovalMigration';
import type { NodeGraph } from './types';

describe('migrateRemoveRegionContourRingsNodes', () => {
  it('splices through upstream when region-contour-rings was in a chain', () => {
    const graph: NodeGraph = {
      id: 'g',
      name: 't',
      version: '2.0',
      nodes: [
        { id: 'u', type: 'uv-coordinates', position: { x: 0, y: 0 }, parameters: {} },
        {
          id: 'r',
          type: 'region-contour-rings',
          position: { x: 0, y: 0 },
          parameters: {},
        },
        { id: 'o', type: 'final-output', position: { x: 0, y: 0 }, parameters: {} },
      ],
      connections: [
        { id: 'c1', sourceNodeId: 'u', sourcePort: 'out', targetNodeId: 'r', targetPort: 'in' },
        { id: 'c2', sourceNodeId: 'r', sourcePort: 'out', targetNodeId: 'o', targetPort: 'in' },
      ],
    };
    const g = migrateRemoveRegionContourRingsNodes(graph);
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['o', 'u']);
    expect(g.connections).toEqual([
      { id: expect.any(String), sourceNodeId: 'u', sourcePort: 'out', targetNodeId: 'o', targetPort: 'in' },
    ]);
  });
});
