/**
 * Tests for computeEffectiveParameterValue using the signal model.
 * Run: npm test (or npx vitest run src/utils/parameterValueCalculator.test.ts)
 */

import { describe, it, expect } from 'vitest';
import type { NodeGraph, NodeInstance } from '../data-model/types';
import type { NodeSpec, ParameterSpec } from '../types/nodeSpec';
import type { IAudioManager } from '../runtime/types';
import { computeEffectiveParameterValue } from './parameterValueCalculator';
import { getVirtualNodeId } from './virtualNodes';

function makeParamSpec(overrides: Partial<ParameterSpec> = {}): ParameterSpec {
  return {
    type: 'float',
    default: 0,
    min: 0,
    max: 1,
    ...overrides,
  };
}

function makeNodeSpec(id: string, params: Record<string, ParameterSpec>): NodeSpec {
  return {
    id,
    displayName: id,
    category: 'Test',
    inputs: [],
    outputs: [],
    parameters: params,
    mainCode: '',
  };
}

describe('computeEffectiveParameterValue with signal model', () => {
  it('uses static config when no automation or connection', () => {
    const node: NodeInstance = {
      id: 'n1',
      type: 'noise',
      position: { x: 0, y: 0 },
      parameters: { gain: 0.25 },
    };
    const graph: NodeGraph = {
      id: 'g1',
      name: 'Test',
      version: '2.0',
      nodes: [node],
      connections: [],
    };
    const paramSpec = makeParamSpec({ default: 0.5, min: 0, max: 1 });
    const nodeSpecs = new Map<string, NodeSpec>([
      ['noise', makeNodeSpec('noise', { gain: paramSpec })],
    ]);

    const value = computeEffectiveParameterValue(
      node,
      'gain',
      paramSpec,
      graph,
      nodeSpecs,
    );

    expect(value).toBeCloseTo(0.25);
  });

  it('prefers automation value over static config when provided', () => {
    const node: NodeInstance = {
      id: 'n1',
      type: 'noise',
      position: { x: 0, y: 0 },
      parameters: { gain: 0.25 },
    };
    const graph: NodeGraph = {
      id: 'g1',
      name: 'Test',
      version: '2.0',
      nodes: [node],
      connections: [],
    };
    const paramSpec = makeParamSpec({ default: 0.5, min: 0, max: 1 });
    const nodeSpecs = new Map<string, NodeSpec>([
      ['noise', makeNodeSpec('noise', { gain: paramSpec })],
    ]);

    const value = computeEffectiveParameterValue(
      node,
      'gain',
      paramSpec,
      graph,
      nodeSpecs,
      undefined,
      0.75,
    );

    expect(value).toBeCloseTo(0.75);
  });

  it('combines automation and graph input using input mode', () => {
    const source: NodeInstance = {
      id: 'src',
      type: 'constant-float',
      position: { x: 0, y: 0 },
      parameters: { value: 2 },
    };
    const target: NodeInstance = {
      id: 'dst',
      type: 'noise',
      position: { x: 0, y: 0 },
      parameters: { gain: 1 },
      parameterInputModes: { gain: 'add' },
    };
    const graph: NodeGraph = {
      id: 'g1',
      name: 'Test',
      version: '2.0',
      nodes: [source, target],
      connections: [
        {
          id: 'c1',
          sourceNodeId: 'src',
          sourcePort: 'out',
          targetNodeId: 'dst',
          targetParameter: 'gain',
        },
      ],
    };
    const gainSpec = makeParamSpec({ default: 1, min: 0, max: 4, inputMode: 'add' });
    const constSpec = makeParamSpec({ default: 0, min: 0, max: 10 });

    const nodeSpecs = new Map<string, NodeSpec>([
      ['constant-float', makeNodeSpec('constant-float', { value: constSpec })],
      ['noise', makeNodeSpec('noise', { gain: gainSpec })],
    ]);

    const value = computeEffectiveParameterValue(
      target,
      'gain',
      gainSpec,
      graph,
      nodeSpecs,
      undefined,
      0.25,
    );

    // automationValue (0.25) is config; input is 2; add mode → 0.25 + 2 (within 0..4 range)
    expect(value).toBeCloseTo(2.25);
  });

  it('clamps effective value to spec min/max after input-mode composition', () => {
    const source: NodeInstance = {
      id: 'src',
      type: 'constant-float',
      position: { x: 0, y: 0 },
      parameters: { value: 10 },
    };
    const target: NodeInstance = {
      id: 'dst',
      type: 'noise',
      position: { x: 0, y: 0 },
      parameters: { gain: 1 },
      parameterInputModes: { gain: 'add' },
    };
    const graph: NodeGraph = {
      id: 'g1',
      name: 'Test',
      version: '2.0',
      nodes: [source, target],
      connections: [
        {
          id: 'c1',
          sourceNodeId: 'src',
          sourcePort: 'out',
          targetNodeId: 'dst',
          targetParameter: 'gain',
        },
      ],
    };
    const gainSpec = makeParamSpec({ default: 1, min: 0, max: 4, inputMode: 'add' });
    const constSpec = makeParamSpec({ default: 0, min: 0, max: 10 });
    const nodeSpecs = new Map<string, NodeSpec>([
      ['constant-float', makeNodeSpec('constant-float', { value: constSpec })],
      ['noise', makeNodeSpec('noise', { gain: gainSpec })],
    ]);

    // config = 1, input = 10, add -> 11, clamped to max 4
    const value = computeEffectiveParameterValue(target, 'gain', gainSpec, graph, nodeSpecs);
    expect(value).toBeCloseTo(4);
  });

  it('resolves audio-connected parameter via virtual node input', () => {
    const target: NodeInstance = {
      id: 'dst',
      type: 'noise',
      position: { x: 0, y: 0 },
      parameters: { gain: 1 },
    };

    const virtualNodeId = getVirtualNodeId('band-test-raw');

    const graph: NodeGraph = {
      id: 'g1',
      name: 'Test',
      version: '2.0',
      nodes: [target],
      connections: [
        {
          id: 'c1',
          sourceNodeId: virtualNodeId,
          sourcePort: 'out',
          targetNodeId: 'dst',
          targetParameter: 'gain',
        },
      ],
    };

    const gainSpec = makeParamSpec({ default: 1, min: 0, max: 2, inputMode: 'multiply' });
    const nodeSpecs = new Map<string, NodeSpec>([
      ['noise', makeNodeSpec('noise', { gain: gainSpec })],
    ]);

    const audioManager: IAudioManager = {
      getVirtualNodeLiveValue(id: string): number | null {
        return id === virtualNodeId ? 0.4 : null;
      },
    } as unknown as IAudioManager;

    const value = computeEffectiveParameterValue(
      target,
      'gain',
      gainSpec,
      graph,
      nodeSpecs,
      audioManager,
    );

    // Audio virtual wires always override: remapped 0.4 is assigned directly (ignores multiply).
    expect(value).toBeCloseTo(0.4);
  });

  it('audio virtual wire ignores multiply mode (uses override)', () => {
    const target: NodeInstance = {
      id: 'dst',
      type: 'noise',
      position: { x: 0, y: 0 },
      parameters: { gain: 2 },
      parameterInputModes: { gain: 'multiply' },
    };
    const virtualNodeId = getVirtualNodeId('remap-test');
    const graph: NodeGraph = {
      id: 'g1',
      name: 'Test',
      version: '2.0',
      nodes: [target],
      connections: [
        {
          id: 'c1',
          sourceNodeId: virtualNodeId,
          sourcePort: 'out',
          targetNodeId: 'dst',
          targetParameter: 'gain',
          driverOutMin: -1,
          driverOutMax: -1,
        },
      ],
    };
    const gainSpec = makeParamSpec({ default: 2, min: -2, max: 2, inputMode: 'multiply' });
    const nodeSpecs = new Map<string, NodeSpec>([
      ['noise', makeNodeSpec('noise', { gain: gainSpec })],
    ]);
    const audioManager: IAudioManager = {
      getVirtualNodeLiveValue(id: string): number | null {
        return id === virtualNodeId ? 1 : null;
      },
    } as unknown as IAudioManager;

    const value = computeEffectiveParameterValue(
      target,
      'gain',
      gainSpec,
      graph,
      nodeSpecs,
      audioManager
    );

    // multiply would yield 2 * 1 = 2; override assigns connection-scaled -1 directly.
    expect(value).toBeCloseTo(-1);
  });

  it('audio virtual wire is not clamped to parameter spec min/max', () => {
    const target: NodeInstance = {
      id: 'dst',
      type: 'noise',
      position: { x: 0, y: 0 },
      parameters: { gain: 0 },
    };
    const virtualNodeId = getVirtualNodeId('remap-test');
    const graph: NodeGraph = {
      id: 'g1',
      name: 'Test',
      version: '2.0',
      nodes: [target],
      connections: [
        {
          id: 'c1',
          sourceNodeId: virtualNodeId,
          sourcePort: 'out',
          targetNodeId: 'dst',
          targetParameter: 'gain',
          driverOutMin: -0.5,
          driverOutMax: 1,
        },
      ],
    };
    const gainSpec = makeParamSpec({ default: 0, min: 0, max: 1 });
    const nodeSpecs = new Map<string, NodeSpec>([
      ['noise', makeNodeSpec('noise', { gain: gainSpec })],
    ]);
    const audioManager: IAudioManager = {
      getVirtualNodeLiveValue(id: string): number | null {
        return id === virtualNodeId ? 0 : null;
      },
    } as unknown as IAudioManager;

    const value = computeEffectiveParameterValue(
      target,
      'gain',
      gainSpec,
      graph,
      nodeSpecs,
      audioManager
    );

    expect(value).toBeCloseTo(-0.5);
  });

  it('snaps int parameters to discrete values when automation yields a float', () => {
    const node: NodeInstance = {
      id: 'n1',
      type: 'primitive',
      position: { x: 0, y: 0 },
      parameters: { primitiveType: 0 },
    };
    const graph: NodeGraph = {
      id: 'g1',
      name: 'Test',
      version: '2.0',
      nodes: [node],
      connections: [],
    };
    const paramSpec = makeParamSpec({
      type: 'int',
      default: 0,
      min: 0,
      max: 7,
      step: 1,
    });
    const nodeSpecs = new Map<string, NodeSpec>([
      ['primitive', makeNodeSpec('primitive', { primitiveType: paramSpec })],
    ]);

    const value = computeEffectiveParameterValue(
      node,
      'primitiveType',
      paramSpec,
      graph,
      nodeSpecs,
      undefined,
      4.35,
    );

    expect(value).toBe(4);
  });

  it('two targets on one remapper get different effective values from connection Out', () => {
    const virtualNodeId = getVirtualNodeId('remap-shared');
    const gatedLive = 0.5;
    const strengthSpec = makeParamSpec({ default: 0, min: 0, max: 1.6 });
    const opacitySpec = makeParamSpec({ default: 0, min: 0, max: 100 });

    const strengthNode: NodeInstance = {
      id: 'n-strength',
      type: 'noise',
      position: { x: 0, y: 0 },
      parameters: { strength: 0 },
    };
    const opacityNode: NodeInstance = {
      id: 'n-opacity',
      type: 'noise',
      position: { x: 0, y: 0 },
      parameters: { opacity: 0 },
    };

    const graph: NodeGraph = {
      id: 'g1',
      name: 'Test',
      version: '2.0',
      nodes: [strengthNode, opacityNode],
      connections: [
        {
          id: 'c-strength',
          sourceNodeId: virtualNodeId,
          sourcePort: 'out',
          targetNodeId: 'n-strength',
          targetParameter: 'strength',
          driverOutMin: 0,
          driverOutMax: 1.6,
        },
        {
          id: 'c-opacity',
          sourceNodeId: virtualNodeId,
          sourcePort: 'out',
          targetNodeId: 'n-opacity',
          targetParameter: 'opacity',
          driverOutMin: 0,
          driverOutMax: 100,
        },
      ],
    };

    const nodeSpecs = new Map<string, NodeSpec>([
      [
        'noise',
        makeNodeSpec('noise', {
          strength: strengthSpec,
          opacity: opacitySpec,
        }),
      ],
    ]);

    const audioManager: IAudioManager = {
      getVirtualNodeLiveValue(id: string): number | null {
        return id === virtualNodeId ? gatedLive : null;
      },
    } as unknown as IAudioManager;

    const strength = computeEffectiveParameterValue(
      strengthNode,
      'strength',
      strengthSpec,
      graph,
      nodeSpecs,
      audioManager
    );
    const opacity = computeEffectiveParameterValue(
      opacityNode,
      'opacity',
      opacitySpec,
      graph,
      nodeSpecs,
      audioManager
    );

    expect(strength).toBeCloseTo(0.8);
    expect(opacity).toBeCloseTo(50);
    expect(strength).not.toBeCloseTo(opacity!);
  });
});

