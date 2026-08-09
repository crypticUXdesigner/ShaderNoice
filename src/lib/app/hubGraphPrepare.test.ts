import { describe, it, expect } from 'vitest';
import type { NodeGraph } from '../../data-model/types';
import { remapGraphIds } from './hubGraphPrepare';

function sampleGraph(): NodeGraph {
  return {
    id: 'graph-old',
    nodes: [
      {
        id: 'node-a',
        type: 'output',
        position: { x: 0, y: 0 },
        parameters: {},
      },
      {
        id: 'node-b',
        type: 'noise',
        position: { x: 10, y: 10 },
        parameters: {},
      },
    ],
    connections: [
      {
        id: 'conn-1',
        sourceNodeId: 'node-b',
        sourcePort: 'out',
        targetNodeId: 'node-a',
        targetPort: 'in',
      },
    ],
    automation: {
      bpm: 120,
      durationSeconds: 1,
      lanes: [{ id: 'lane-1', nodeId: 'node-b', paramName: 'scale', regions: [] }],
    },
    viewState: { zoom: 1, panX: 0, panY: 0, selectedNodeIds: ['node-a'] },
  };
}

describe('remapGraphIds', () => {
  it('assigns new ids and clears selection', () => {
    const g = sampleGraph();
    const remapped = remapGraphIds(g);
    expect(remapped.id).not.toBe(g.id);
    expect(remapped.nodes[0].id).not.toBe('node-a');
    expect(remapped.nodes[1].id).not.toBe('node-b');
    expect(remapped.connections[0].sourceNodeId).toBe(remapped.nodes[1].id);
    expect(remapped.connections[0].targetNodeId).toBe(remapped.nodes[0].id);
    expect(remapped.automation?.lanes[0].nodeId).toBe(remapped.nodes[1].id);
    expect(remapped.viewState?.selectedNodeIds).toEqual([]);
  });
});
