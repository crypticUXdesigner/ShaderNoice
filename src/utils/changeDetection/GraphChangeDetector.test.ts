import { describe, expect, it } from 'vitest';
import type { Connection, NodeGraph } from '../../data-model/types';
import { GraphChangeDetector } from './GraphChangeDetector';
import { ChangeType } from './types';

function graph(nodes: NodeGraph['nodes'], connections: Connection[]): NodeGraph {
  return {
    id: 'g1',
    name: 'Test',
    version: '2.0',
    nodes,
    connections,
    viewState: { zoom: 1, panX: 0, panY: 0, selectedNodeIds: [] },
  };
}

/** A → B → C → out, plus isolated filler nodes so "all nodes" would be large. */
function chainGraph(extraIsolated = 4): NodeGraph {
  const nodes: NodeGraph['nodes'] = [
    { id: 'a', type: 'time', position: { x: 0, y: 0 }, parameters: {} },
    { id: 'b', type: 'math', position: { x: 100, y: 0 }, parameters: { amount: 1 } },
    { id: 'c', type: 'math', position: { x: 200, y: 0 }, parameters: { amount: 1 } },
    { id: 'out', type: 'final-output', position: { x: 300, y: 0 }, parameters: {} },
  ];
  for (let i = 0; i < extraIsolated; i++) {
    nodes.push({
      id: `iso-${i}`,
      type: 'math',
      position: { x: 0, y: 100 + i * 20 },
      parameters: { amount: 0 },
    });
  }
  const connections: Connection[] = [
    { id: 'c-ab', sourceNodeId: 'a', sourcePort: 'out', targetNodeId: 'b', targetPort: 'in' },
    { id: 'c-bc', sourceNodeId: 'b', sourcePort: 'out', targetNodeId: 'c', targetPort: 'in' },
    { id: 'c-co', sourceNodeId: 'c', sourcePort: 'out', targetNodeId: 'out', targetPort: 'in' },
  ];
  return graph(nodes, connections);
}

describe('GraphChangeDetector — connection-only affected sets', () => {
  it('connection add seeds endpoints + dependents, not every node', () => {
    const before = chainGraph();
    const after: NodeGraph = {
      ...before,
      connections: [
        ...before.connections,
        {
          id: 'c-a-out',
          sourceNodeId: 'a',
          sourcePort: 'out',
          targetNodeId: 'out',
          targetPort: 'in',
        },
      ],
    };

    const result = GraphChangeDetector.detectChanges(before, after, {
      trackAffectedNodes: true,
      includeConnectionIds: true,
    });

    expect(result.isConnectionsChanged).toBe(true);
    expect(result.isStructureChanged).toBe(false);
    expect(result.isOnlyPositionChange).toBe(false);
    expect(result.addedConnectionIds).toEqual(['c-a-out']);
    // a + out (endpoints); out has no further dependents
    expect(result.affectedNodeIds.has('a')).toBe(true);
    expect(result.affectedNodeIds.has('out')).toBe(true);
    expect(result.affectedNodeIds.size).toBeLessThan(after.nodes.length);
    expect(result.affectedNodeIds.has('iso-0')).toBe(false);
  });

  it('connection remove seeds former endpoints + dependents, not every node', () => {
    const before = chainGraph();
    const after: NodeGraph = {
      ...before,
      connections: before.connections.filter((c) => c.id !== 'c-bc'),
    };

    const result = GraphChangeDetector.detectChanges(before, after, {
      trackAffectedNodes: true,
      includeConnectionIds: true,
    });

    expect(result.isConnectionsChanged).toBe(true);
    expect(result.removedConnectionIds).toEqual(['c-bc']);
    expect(result.affectedNodeIds.has('b')).toBe(true);
    expect(result.affectedNodeIds.has('c')).toBe(true);
    // c's dependents include out
    expect(result.affectedNodeIds.has('out')).toBe(true);
    expect(result.affectedNodeIds.size).toBeLessThan(after.nodes.length);
    expect(result.affectedNodeIds.has('iso-0')).toBe(false);
  });

  it('same-id connection modify seeds old and new endpoints, not every node', () => {
    const before = chainGraph();
    const after: NodeGraph = {
      ...before,
      connections: before.connections.map((c) =>
        c.id === 'c-bc'
          ? {
              ...c,
              // Retarget B→C wire to B→out (same connection id).
              targetNodeId: 'out',
              targetPort: 'in',
            }
          : c
      ),
    };

    const result = GraphChangeDetector.detectChanges(before, after, {
      trackAffectedNodes: true,
      includeConnectionIds: true,
    });

    expect(result.isConnectionsChanged).toBe(true);
    expect(result.addedConnectionIds).toEqual([]);
    expect(result.removedConnectionIds).toEqual([]);
    // Old endpoints b+c and new target out
    expect(result.affectedNodeIds.has('b')).toBe(true);
    expect(result.affectedNodeIds.has('c')).toBe(true);
    expect(result.affectedNodeIds.has('out')).toBe(true);
    expect(result.affectedNodeIds.size).toBeLessThan(after.nodes.length);
    expect(result.affectedNodeIds.has('iso-0')).toBe(false);
  });

  it('position-only still short-circuits with empty affected set', () => {
    const before = chainGraph();
    const after: NodeGraph = {
      ...before,
      nodes: before.nodes.map((n) =>
        n.id === 'a' ? { ...n, position: { x: 50, y: 50 } } : n
      ),
    };

    expect(GraphChangeDetector.isOnlyPositionChange(before, after)).toBe(true);
    const result = GraphChangeDetector.detectChanges(before, after, {
      trackAffectedNodes: true,
      includeConnectionIds: true,
    });
    expect(result.changeType).toBe(ChangeType.POSITION_ONLY);
    expect(result.isOnlyPositionChange).toBe(true);
    expect(result.isConnectionsChanged).toBe(false);
    expect(result.affectedNodeIds.size).toBe(0);
  });

  it('automation-only still marks structure + lane node ids', () => {
    const before = graph(
      [{ id: 'n1', type: 'math', position: { x: 0, y: 0 }, parameters: { amount: 0.5 } }],
      []
    );
    const after: NodeGraph = {
      ...before,
      automation: {
        bpm: 120,
        durationSeconds: 10,
        lanes: [
          {
            id: 'lane1',
            nodeId: 'n1',
            paramName: 'amount',
            regions: [
              {
                id: 'r1',
                startTime: 0,
                duration: 1,
                loop: false,
                curve: {
                  keyframes: [
                    { time: 0, value: 0 },
                    { time: 1, value: 1 },
                  ],
                  interpolation: 'linear',
                },
              },
            ],
          },
        ],
      },
    };

    const result = GraphChangeDetector.detectChanges(before, after, {
      trackAffectedNodes: true,
      includeConnectionIds: true,
    });
    expect(result.isStructureChanged).toBe(true);
    expect(result.isConnectionsChanged).toBe(false);
    expect(result.changedNodeIds).toContain('n1');
    expect(result.affectedNodeIds.has('n1')).toBe(true);
  });
});
