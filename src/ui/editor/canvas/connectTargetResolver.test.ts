import { describe, expect, it } from 'vitest';
import type { NodeGraph } from '../../../data-model/types';
import type { NodeSpec } from '../../../types/nodeSpec';
import type { NodeRenderMetrics } from '../NodeRenderer';
import {
  findNearestConnectTarget,
  isValidConnectTarget,
  type ConnectSource,
  type ConnectTargetResolverDeps,
  type PortHit,
} from './connectTargetResolver';

function makeDeps(overrides: Partial<ConnectTargetResolverDeps> = {}): ConnectTargetResolverDeps {
  const graph: NodeGraph = {
    nodes: [
      { id: 'n1', type: 'source', position: { x: 0, y: 0 }, parameters: {} },
      { id: 'n2', type: 'target', position: { x: 200, y: 0 }, parameters: {} },
      { id: 'n3', type: 'other', position: { x: 400, y: 0 }, parameters: {} },
    ],
    connections: [],
    viewState: { zoom: 1, panX: 0, panY: 0, selectedNodeIds: [] },
    automation: { lanes: [], regions: [] },
  };

  const sourceSpec: NodeSpec = {
    id: 'source',
    displayName: 'Source',
    category: 'generator',
    inputs: [],
    outputs: [{ name: 'out', type: 'vec3' }],
    parameters: {},
    mainCode: '',
  };

  const targetSpec: NodeSpec = {
    id: 'target',
    displayName: 'Target',
    category: 'filter',
    inputs: [{ name: 'in', type: 'vec3' }],
    outputs: [{ name: 'out', type: 'vec3' }],
    parameters: {
      amount: { type: 'float', default: 0.5, min: 0, max: 1 },
    },
    mainCode: '',
  };

  const otherSpec: NodeSpec = {
    id: 'other',
    displayName: 'Other',
    category: 'filter',
    inputs: [{ name: 'in', type: 'bool' }],
    outputs: [{ name: 'out', type: 'float' }],
    parameters: {},
    mainCode: '',
  };

  const nodeSpecs = new Map<string, NodeSpec>([
    ['source', sourceSpec],
    ['target', targetSpec],
    ['other', otherSpec],
  ]);

  const nodeMetrics = new Map<string, NodeRenderMetrics>([
    [
      'n2',
      {
        width: 100,
        height: 80,
        portPositions: new Map([['input:in', { x: 200, y: 40 }]]),
        parameterInputPortPositions: new Map([['amount', { x: 220, y: 60 }]]),
        parameterGridPositions: new Map(),
      } as NodeRenderMetrics,
    ],
    [
      'n3',
      {
        width: 100,
        height: 80,
        portPositions: new Map([['input:in', { x: 400, y: 40 }]]),
        parameterInputPortPositions: new Map(),
        parameterGridPositions: new Map(),
      } as NodeRenderMetrics,
    ],
  ]);

  return {
    graph,
    nodeSpecs,
    nodeMetrics,
    screenToCanvas: (screenX, screenY) => ({ x: screenX, y: screenY }),
    getViewState: () => ({ panX: 0, panY: 0, zoom: 1 }),
    hitTestPort: () => null,
    ...overrides,
  };
}

describe('isValidConnectTarget', () => {
  it('rejects same-node targets', () => {
    const deps = makeDeps();
    const source: ConnectSource = { nodeId: 'n1', port: 'out', isOutput: true };
    const target: PortHit = { nodeId: 'n1', port: 'in', isOutput: false };
    expect(isValidConnectTarget(source, target, deps)).toBe(false);
  });

  it('requires compatible types for output-to-input', () => {
    const deps = makeDeps();
    const source: ConnectSource = { nodeId: 'n1', port: 'out', isOutput: true };
    const compatible: PortHit = { nodeId: 'n2', port: 'in', isOutput: false };
    const incompatible: PortHit = { nodeId: 'n3', port: 'in', isOutput: false };
    expect(isValidConnectTarget(source, compatible, deps)).toBe(true);
    expect(isValidConnectTarget(source, incompatible, deps)).toBe(false);
  });
});

describe('findNearestConnectTarget', () => {
  it('returns null when no port is within magnetic radius', () => {
    const deps = makeDeps();
    const source: ConnectSource = { nodeId: 'n1', port: 'out', isOutput: true };
    expect(findNearestConnectTarget(source, 0, 0, deps, 10)).toBeNull();
  });

  it('picks the closest compatible port within radius', () => {
    const deps = makeDeps();
    const source: ConnectSource = { nodeId: 'n1', port: 'out', isOutput: true };
    const hit = findNearestConnectTarget(source, 205, 42, deps, 30);
    expect(hit).toEqual({ nodeId: 'n2', port: 'in', isOutput: false });
  });

  it('excludes same-node ports even when pointer is near', () => {
    const deps = makeDeps({
      nodeMetrics: new Map([
        [
          'n1',
          {
            width: 100,
            height: 80,
            portPositions: new Map([['input:in', { x: 10, y: 10 }]]),
            parameterInputPortPositions: new Map(),
            parameterGridPositions: new Map(),
          } as NodeRenderMetrics,
        ],
      ]),
    });
    const source: ConnectSource = { nodeId: 'n1', port: 'out', isOutput: true };
    expect(findNearestConnectTarget(source, 12, 12, deps, 40)).toBeNull();
  });

  it('prefers closer compatible port over a farther one', () => {
    const deps = makeDeps({
      nodeMetrics: new Map([
        [
          'n2',
          {
            width: 100,
            height: 80,
            portPositions: new Map([['input:in', { x: 200, y: 40 }]]),
            parameterInputPortPositions: new Map([['amount', { x: 210, y: 40 }]]),
            parameterGridPositions: new Map(),
          } as NodeRenderMetrics,
        ],
        [
          'n3',
          {
            width: 100,
            height: 80,
            portPositions: new Map([['input:in', { x: 250, y: 40 }]]),
            parameterInputPortPositions: new Map(),
            parameterGridPositions: new Map(),
          } as NodeRenderMetrics,
        ],
      ]),
    });
    const source: ConnectSource = { nodeId: 'n1', port: 'out', isOutput: true };
    const hit = findNearestConnectTarget(source, 205, 40, deps, 30);
    expect(hit?.nodeId).toBe('n2');
    expect(hit?.port).toBe('in');
  });
});
