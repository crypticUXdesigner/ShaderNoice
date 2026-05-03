import { describe, it } from 'vitest';
import type { NodeGraph } from './types';
import type { NodeSpecification } from './validationTypes';
import { insertNodeIntoConnection } from './insertNodeIntoConnection';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message || 'Values not equal'}\n  Expected: ${expected}\n  Actual: ${actual}`
    );
  }
}

const patchSpecs: NodeSpecification[] = [
  {
    id: 'vec2-source',
    outputs: [{ name: 'out', type: 'vec2' }],
    parameters: {},
  },
  {
    id: 'vec2-through',
    inputs: [{ name: 'in', type: 'vec2' }],
    outputs: [{ name: 'out', type: 'vec2' }],
    parameters: {},
  },
  {
    id: 'vec2-sink',
    inputs: [{ name: 'in', type: 'vec2' }],
    parameters: {},
  },
  {
    id: 'dual-float',
    inputs: [
      { name: 'a', type: 'float' },
      { name: 'b', type: 'float' },
    ],
    outputs: [{ name: 'out', type: 'float' }],
    parameters: {},
  },
  {
    id: 'float-src',
    outputs: [{ name: 'out', type: 'float' }],
    parameters: {},
  },
  {
    id: 'float-sink',
    inputs: [{ name: 'in', type: 'float' }],
    parameters: {},
  },
];

describe('insertNodeIntoConnection', () => {
  it('splices one valid pairing', () => {
    const graph: NodeGraph = {
      id: 'g',
      name: 't',
      version: '2.0',
      nodes: [
        { id: 'src', type: 'vec2-source', position: { x: 0, y: 0 }, parameters: {} },
        { id: 'mid', type: 'vec2-through', position: { x: 1, y: 0 }, parameters: {} },
        { id: 'extra', type: 'vec2-through', position: { x: 2, y: 0 }, parameters: {} },
        { id: 'sink', type: 'vec2-sink', position: { x: 3, y: 0 }, parameters: {} },
      ],
      connections: [
        {
          id: 'c-main',
          sourceNodeId: 'src',
          sourcePort: 'out',
          targetNodeId: 'mid',
          targetPort: 'in',
        },
        {
          id: 'c-next',
          sourceNodeId: 'mid',
          sourcePort: 'out',
          targetNodeId: 'sink',
          targetPort: 'in',
        },
      ],
    };

    const result = insertNodeIntoConnection(graph, 'c-main', 'extra', patchSpecs);
    assert(result.ok === true, 'should splice');
    if (!result.ok) return;
    assertEqual(result.graph.connections.length, 3, 'three wires');
    assert(
      result.graph.connections.some(
        (c) =>
          c.sourceNodeId === 'src' &&
          c.targetNodeId === 'extra' &&
          c.targetPort === 'in'
      ),
      'src to extra'
    );
    assert(
      result.graph.connections.some(
        (c) =>
          c.sourceNodeId === 'extra' &&
          c.targetNodeId === 'mid' &&
          c.targetPort === 'in'
      ),
      'extra to mid'
    );
  });

  it('uses first compatible input (spec order) when multiple inputs fit', () => {
    const graph: NodeGraph = {
      id: 'g',
      name: 't',
      version: '2.0',
      nodes: [
        { id: 'src', type: 'float-src', position: { x: 0, y: 0 }, parameters: {} },
        { id: 'sink', type: 'float-sink', position: { x: 2, y: 0 }, parameters: {} },
        { id: 'dual', type: 'dual-float', position: { x: 1, y: 0 }, parameters: {} },
      ],
      connections: [
        {
          id: 'c-edge',
          sourceNodeId: 'src',
          sourcePort: 'out',
          targetNodeId: 'sink',
          targetPort: 'in',
        },
      ],
    };

    const result = insertNodeIntoConnection(graph, 'c-edge', 'dual', patchSpecs);
    assert(result.ok === true, 'should patch deterministically');
    if (!result.ok) return;
    const fromSrc = result.graph.connections.find(
      (c) => c.sourceNodeId === 'src' && c.targetNodeId === 'dual'
    );
    assert(fromSrc != null && fromSrc.targetPort === 'a', 'first compatible input is a');
  });

  it('prefers first free compatible input when an earlier compatible input is occupied', () => {
    const graph: NodeGraph = {
      id: 'g',
      name: 't',
      version: '2.0',
      nodes: [
        { id: 'src', type: 'float-src', position: { x: 0, y: 0 }, parameters: {} },
        { id: 'other', type: 'float-src', position: { x: 0, y: 0 }, parameters: {} },
        { id: 'sink', type: 'float-sink', position: { x: 2, y: 0 }, parameters: {} },
        { id: 'dual', type: 'dual-float', position: { x: 1, y: 0 }, parameters: {} },
      ],
      connections: [
        {
          id: 'c-edge',
          sourceNodeId: 'src',
          sourcePort: 'out',
          targetNodeId: 'sink',
          targetPort: 'in',
        },
        {
          id: 'c-a',
          sourceNodeId: 'other',
          sourcePort: 'out',
          targetNodeId: 'dual',
          targetPort: 'a',
        },
      ],
    };

    const result = insertNodeIntoConnection(graph, 'c-edge', 'dual', patchSpecs);
    assert(result.ok === true, 'should patch');
    if (!result.ok) return;
    const fromSrc = result.graph.connections.find(
      (c) => c.sourceNodeId === 'src' && c.targetNodeId === 'dual'
    );
    assert(fromSrc != null && fromSrc.targetPort === 'b', 'first free compatible input is b');
  });

  it('replaces first compatible input when every compatible input is already wired', () => {
    const graph: NodeGraph = {
      id: 'g',
      name: 't',
      version: '2.0',
      nodes: [
        { id: 'src', type: 'float-src', position: { x: 0, y: 0 }, parameters: {} },
        { id: 'o1', type: 'float-src', position: { x: 0, y: 0 }, parameters: {} },
        { id: 'o2', type: 'float-src', position: { x: 0, y: 0 }, parameters: {} },
        { id: 'sink', type: 'float-sink', position: { x: 2, y: 0 }, parameters: {} },
        { id: 'dual', type: 'dual-float', position: { x: 1, y: 0 }, parameters: {} },
      ],
      connections: [
        {
          id: 'c-edge',
          sourceNodeId: 'src',
          sourcePort: 'out',
          targetNodeId: 'sink',
          targetPort: 'in',
        },
        {
          id: 'c-a',
          sourceNodeId: 'o1',
          sourcePort: 'out',
          targetNodeId: 'dual',
          targetPort: 'a',
        },
        {
          id: 'c-b',
          sourceNodeId: 'o2',
          sourcePort: 'out',
          targetNodeId: 'dual',
          targetPort: 'b',
        },
      ],
    };

    const result = insertNodeIntoConnection(graph, 'c-edge', 'dual', patchSpecs);
    assert(result.ok === true, 'should patch');
    if (!result.ok) return;
    assert(
      !result.graph.connections.some((c) => c.id === 'c-a'),
      'incoming patch replaces previous wire to input a'
    );
    const fromSrc = result.graph.connections.find(
      (c) => c.sourceNodeId === 'src' && c.targetNodeId === 'dual'
    );
    assert(fromSrc != null && fromSrc.targetPort === 'a', 'falls back to first compatible input');
  });

  it('rejects insert node that is an endpoint of the wire', () => {
    const graph: NodeGraph = {
      id: 'g',
      name: 't',
      version: '2.0',
      nodes: [
        { id: 'src', type: 'vec2-source', position: { x: 0, y: 0 }, parameters: {} },
        { id: 'sink', type: 'vec2-sink', position: { x: 2, y: 0 }, parameters: {} },
      ],
      connections: [
        {
          id: 'c-edge',
          sourceNodeId: 'src',
          sourcePort: 'out',
          targetNodeId: 'sink',
          targetPort: 'in',
        },
      ],
    };

    const r = insertNodeIntoConnection(graph, 'c-edge', 'src', patchSpecs);
    assert(r.ok === false && r.code === 'cannot_patch_endpoint_node', 'endpoint');
  });
});
