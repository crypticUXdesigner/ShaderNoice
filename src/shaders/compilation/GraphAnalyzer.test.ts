import { describe, it, expect } from 'vitest';
import type { NodeGraph } from '../../data-model/types';
import { GraphAnalyzer } from './GraphAnalyzer';

describe('GraphAnalyzer.topologicalSort', () => {
  it('orders a node after upstream math when two parameter wires share the same source (multi-edge)', () => {
    const osc = 'n-osc';
    const mul = 'n-mul';
    const prim = 'n-prim';
    const uv = 'n-uv';
    const out = 'n-out';

    const graph: NodeGraph = {
      id: 'g',
      name: 't',
      version: '2.0',
      nodes: [
        { id: uv, type: 'uv-coordinates', position: { x: 0, y: 0 }, parameters: {} },
        { id: osc, type: 'oscillator-2d', position: { x: 0, y: 0 }, parameters: {} },
        { id: mul, type: 'multiply', position: { x: 0, y: 0 }, parameters: { b: 1 } },
        { id: prim, type: 'box-torus-sdf', position: { x: 0, y: 0 }, parameters: {} },
        { id: out, type: 'final-output', position: { x: 0, y: 0 }, parameters: {} },
      ],
      connections: [
        { id: 'c0', sourceNodeId: uv, sourcePort: 'out', targetNodeId: prim, targetPort: 'in' },
        { id: 'c1', sourceNodeId: osc, sourcePort: 'x', targetNodeId: prim, targetParameter: 'primitiveCenterX' },
        { id: 'c2', sourceNodeId: osc, sourcePort: 'y', targetNodeId: prim, targetParameter: 'primitiveCenterY' },
        { id: 'c3', sourceNodeId: osc, sourcePort: 'x', targetNodeId: mul, targetPort: 'a' },
        { id: 'c4', sourceNodeId: mul, sourcePort: 'out', targetNodeId: prim, targetParameter: 'primitiveRotationX' },
        { id: 'c5', sourceNodeId: prim, sourcePort: 'out', targetNodeId: out, targetPort: 'in' },
      ],
    };

    const analyzer = new GraphAnalyzer();
    const order = analyzer.topologicalSort(graph);
    expect(order.indexOf(mul)).toBeLessThan(order.indexOf(prim));
    expect(order.indexOf(osc)).toBeLessThan(order.indexOf(prim));
  });
});
