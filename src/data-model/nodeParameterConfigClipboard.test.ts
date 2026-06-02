import { describe, expect, it, beforeEach } from 'vitest';
import type { NodeGraph } from './types';
import type { ParameterSpec } from '../types/nodeSpec';
import {
  applyNodeParameterConfig,
  applyNodeParameterConfigToNodes,
  clearNodeParameterConfigClipboard,
  extractNodeParameterConfig,
  getNodeParameterConfigClipboard,
  parseNodeParameterConfig,
  resolvePasteTargetNodeIds,
  serializeNodeParameterConfig,
  setNodeParameterConfigClipboard,
} from './nodeParameterConfigClipboard';
import { findNode } from './utils';

const noiseSpecs: Record<string, ParameterSpec> = {
  noiseScale: { type: 'float', default: 2.0, min: 0.1, max: 10.0 },
  noiseOctaves: { type: 'int', default: 4, min: 1, max: 8 },
  noiseIntensity: { type: 'float', default: 0.5, min: 0.0, max: 1.0 },
};

function noiseGraph(overrides?: Partial<NodeGraph['nodes'][0]>): NodeGraph {
  return {
    id: 'g',
    name: 't',
    version: '2.0',
    nodes: [
      {
        id: 'n1',
        type: 'noise',
        position: { x: 0, y: 0 },
        parameters: {
          noiseScale: 9,
          noiseOctaves: 8,
          noiseIntensity: 0.1,
        },
        parameterInputModes: { noiseScale: 'multiply' },
        ...overrides,
      },
    ],
    connections: [],
  };
}

describe('nodeParameterConfigClipboard', () => {
  beforeEach(() => {
    clearNodeParameterConfigClipboard();
  });

  it('extracts stored parameters and modes', () => {
    const graph = noiseGraph();
    const node = findNode(graph, 'n1')!;
    const snap = extractNodeParameterConfig(node, noiseSpecs);
    expect(snap.nodeType).toBe('noise');
    expect(snap.parameters.noiseScale).toBe(9);
    expect(snap.parameterInputModes?.noiseScale).toBe('multiply');
    expect(snap.parameters).not.toHaveProperty('unknownParam');
  });

  it('apply partially updates only snapshot keys', () => {
    const g2: NodeGraph = {
      ...noiseGraph(),
      nodes: [
        noiseGraph().nodes[0],
        {
          id: 'n2',
          type: 'noise',
          position: { x: 10, y: 0 },
          parameters: { noiseScale: 1, noiseOctaves: 2, noiseIntensity: 0.3 },
        },
      ],
    };
    const snap = extractNodeParameterConfig(g2.nodes[0], noiseSpecs);
    const partial = {
      ...snap,
      parameters: { noiseScale: 7 },
      parameterInputModes: undefined,
    };
    const next = applyNodeParameterConfig(g2, 'n2', partial, noiseSpecs);
    const n2 = findNode(next, 'n2')!;
    expect(n2.parameters.noiseScale).toBe(7);
    expect(n2.parameters.noiseOctaves).toBe(2);
    expect(n2.parameters.noiseIntensity).toBe(0.3);
    expect(n2.parameterInputModes).toBeUndefined();
  });

  it('resolvePasteTargetNodeIds uses selection and context node', () => {
    const graph: NodeGraph = {
      ...noiseGraph(),
      nodes: [
        ...noiseGraph().nodes,
        { id: 'n2', type: 'noise', position: { x: 0, y: 0 }, parameters: {} },
        { id: 'uv', type: 'uv-coordinates', position: { x: 0, y: 0 }, parameters: {} },
      ],
      viewState: { zoom: 1, panX: 0, panY: 0, selectedNodeIds: ['n2', 'uv'] },
    };
    const ids = resolvePasteTargetNodeIds(graph, 'n1', 'noise');
    expect(ids.sort()).toEqual(['n1', 'n2']);
  });

  it('serializes and parses clipboard JSON', () => {
    const snap = extractNodeParameterConfig(noiseGraph().nodes[0], noiseSpecs);
    const json = serializeNodeParameterConfig(snap);
    const parsed = parseNodeParameterConfig(json);
    expect(parsed?.nodeType).toBe('noise');
    expect(parsed?.parameters.noiseScale).toBe(9);
  });

  it('memory clipboard round-trip', () => {
    const snap = extractNodeParameterConfig(noiseGraph().nodes[0], noiseSpecs);
    setNodeParameterConfigClipboard(snap);
    expect(getNodeParameterConfigClipboard()?.parameters.noiseScale).toBe(9);
  });

  it('applyNodeParameterConfigToNodes updates multiple nodes', () => {
    const graph: NodeGraph = {
      ...noiseGraph(),
      nodes: [
        noiseGraph().nodes[0],
        {
          id: 'n2',
          type: 'noise',
          position: { x: 0, y: 0 },
          parameters: { noiseScale: 1, noiseOctaves: 4, noiseIntensity: 0.5 },
        },
      ],
    };
    const snap = extractNodeParameterConfig(graph.nodes[0], noiseSpecs);
    const next = applyNodeParameterConfigToNodes(graph, ['n1', 'n2'], snap, noiseSpecs);
    expect(findNode(next, 'n2')?.parameters.noiseScale).toBe(9);
  });
});
