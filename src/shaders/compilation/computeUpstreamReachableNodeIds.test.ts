import { describe, expect, it } from 'vitest';
import type { NodeGraph } from '../../data-model/types';
import { computeUpstreamReachableNodeIds } from './computeUpstreamReachableNodeIds';

function node(id: string, type: string) {
  return { id, type, position: { x: 0, y: 0 }, parameters: {} };
}

function conn(
  id: string,
  sourceNodeId: string,
  targetNodeId: string,
  sourcePort = 'out',
  targetPort = 'in'
) {
  return { id, sourceNodeId, sourcePort, targetNodeId, targetPort };
}

function graph(nodes: NodeGraph['nodes'], connections: NodeGraph['connections']): NodeGraph {
  return { id: 'g', name: 'test', version: '2.0', nodes, connections };
}

describe('computeUpstreamReachableNodeIds', () => {
  it('walks a diamond graph upstream from final-output', () => {
    const g = graph(
      [node('a', 'uv-coordinates'), node('b', 'noise'), node('c', 'multiply'), node('d', 'final-output')],
      [
        conn('c1', 'a', 'b'),
        conn('c2', 'a', 'c'),
        conn('c3', 'b', 'd'),
        conn('c4', 'c', 'd'),
      ]
    );
    expect(computeUpstreamReachableNodeIds(g, 'd')).toEqual(new Set(['d', 'b', 'c', 'a']));
  });

  it('excludes disconnected sibling branches', () => {
    const g = graph(
      [
        node('noise', 'noise'),
        node('out', 'final-output'),
        node('uv', 'uv-coordinates'),
        node('notes', 'arrangement-notes'),
      ],
      [
        conn('c-hot', 'noise', 'out'),
        conn('c-cold-uv', 'uv', 'notes'),
      ]
    );
    expect(computeUpstreamReachableNodeIds(g, 'out')).toEqual(new Set(['out', 'noise']));
  });

  it('returns only final-output when its input is unwired', () => {
    const g = graph(
      [node('noise', 'noise'), node('out', 'final-output')],
      []
    );
    expect(computeUpstreamReachableNodeIds(g, 'out')).toEqual(new Set(['out']));
  });
});
