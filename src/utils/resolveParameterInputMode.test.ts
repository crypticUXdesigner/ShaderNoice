import { describe, expect, it } from 'vitest';
import type { NodeGraph } from '../data-model/types';
import {
  findActiveParameterConnection,
  isParameterUniformSuppressedByConnection,
} from './resolveParameterInputMode';

function graphWithConnection(disabled?: boolean): NodeGraph {
  return {
    id: 'g1',
    name: 'Test',
    version: '2.0',
    nodes: [
      {
        id: 'n1',
        type: 'radial-uv-warp',
        position: { x: 0, y: 0 },
        parameters: { fisheyeStrength: 0.4 },
      },
    ],
    connections: [
      {
        id: 'c1',
        sourceNodeId: 'audio-signal:remap-r1',
        sourcePort: 'out',
        targetNodeId: 'n1',
        targetParameter: 'fisheyeStrength',
        ...(disabled ? { disabled: true } : {}),
      },
    ],
  };
}

describe('resolveParameterInputMode helpers', () => {
  it('findActiveParameterConnection ignores bypassed wires', () => {
    expect(findActiveParameterConnection(graphWithConnection(), 'n1', 'fisheyeStrength')).toBeDefined();
    expect(findActiveParameterConnection(graphWithConnection(true), 'n1', 'fisheyeStrength')).toBeUndefined();
  });

  it('isParameterUniformSuppressedByConnection is false when driver is bypassed', () => {
    const graph = graphWithConnection(true);
    const node = graph.nodes[0];
    expect(isParameterUniformSuppressedByConnection(graph, node, 'fisheyeStrength')).toBe(false);
  });

  it('isParameterUniformSuppressedByConnection is true for active audio override', () => {
    const graph = graphWithConnection();
    const node = graph.nodes[0];
    expect(isParameterUniformSuppressedByConnection(graph, node, 'fisheyeStrength')).toBe(true);
  });
});
