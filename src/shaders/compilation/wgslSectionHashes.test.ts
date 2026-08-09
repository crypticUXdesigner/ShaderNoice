import { describe, it, expect } from 'vitest';
import {
  computeWgslCodegenDigest,
  fingerprintWgslPassPlanInputs,
  hashWgslPassPlanDescriptor,
} from './wgslSectionHashes';
import { WGSL_WEBGPU_PASS_PLAN_NODE_TYPES } from './wgslPassPlanNodeTypes';
import type { NodeGraph } from '../../data-model/types';
import type { NodeSpec } from '../../types/nodeSpec';
import type { WebGpuPassPlan } from '../../compile-contract';

describe('wgslSectionHashes', () => {
  it('fingerprints only WGSL_WEBGPU_PASS_PLAN_NODE_TYPES (shared SSOT)', () => {
    expect(WGSL_WEBGPU_PASS_PLAN_NODE_TYPES.has('blur')).toBe(true);
    const graph: NodeGraph = {
      id: 'g',
      name: 'g',
      version: '2.0',
      nodes: [
        { id: 'n-blur', type: 'blur', position: { x: 0, y: 0 }, parameters: {} },
        { id: 'n-noise', type: 'value-noise', position: { x: 0, y: 0 }, parameters: {} },
        { id: 'n-out', type: 'final-output', position: { x: 0, y: 0 }, parameters: {} },
      ],
      connections: [],
    };
    const fp = fingerprintWgslPassPlanInputs({
      compileGraph: graph,
      compileExecutionOrder: ['n-blur', 'n-noise', 'n-out'],
    });
    expect(fp).toBe('blur@n-blur>final=0');
    expect(fp.includes('value-noise')).toBe(false);
  });

  it('fingerprint distinguishes pass-plan wiring to final-output', () => {
    const wired: NodeGraph = {
      id: 'g',
      name: 'g',
      version: '2.0',
      nodes: [
        { id: 'n-blur', type: 'blur', position: { x: 0, y: 0 }, parameters: {} },
        { id: 'n-out', type: 'final-output', position: { x: 0, y: 0 }, parameters: {} },
      ],
      connections: [
        {
          id: 'c1',
          sourceNodeId: 'n-blur',
          sourcePort: 'out',
          targetNodeId: 'n-out',
          targetPort: 'in',
        },
      ],
    };
    const unwired: NodeGraph = { ...wired, connections: [] };
    expect(
      fingerprintWgslPassPlanInputs({
        compileGraph: wired,
        compileExecutionOrder: ['n-blur', 'n-out'],
      })
    ).toBe('blur@n-blur>final=1');
    expect(
      fingerprintWgslPassPlanInputs({
        compileGraph: unwired,
        compileExecutionOrder: ['n-blur', 'n-out'],
      })
    ).toBe('blur@n-blur>final=0');
  });

  it('codegen digest ignores uniform-backed float values', () => {
    const specs = new Map<string, NodeSpec>([
      [
        'constant-float',
        {
          id: 'constant-float',
          displayName: 'Const',
          category: 'input',
          inputs: [],
          outputs: [{ name: 'out', type: 'float' }],
          parameters: { value: { type: 'float', default: 0 } },
          mainCode: '',
        },
      ],
    ]);
    const graphA: NodeGraph = {
      id: 'g',
      name: 'g',
      version: '2.0',
      nodes: [{ id: 'n1', type: 'constant-float', position: { x: 0, y: 0 }, parameters: { value: 0.1 } }],
      connections: [],
    };
    const graphB: NodeGraph = {
      ...graphA,
      nodes: [{ id: 'n1', type: 'constant-float', position: { x: 0, y: 0 }, parameters: { value: 0.9 } }],
    };
    const uniformNames = new Map([['n1.value', 'uN1Value']]);
    const a = computeWgslCodegenDigest({
      compileGraph: graphA,
      compileExecutionOrder: ['n1'],
      nodeSpecs: specs,
      uniformNames,
    });
    const b = computeWgslCodegenDigest({
      compileGraph: graphB,
      compileExecutionOrder: ['n1'],
      nodeSpecs: specs,
      uniformNames,
    });
    expect(a).toBe(b);
  });

  it('pass-plan descriptor hash omits inputWgsl', () => {
    const planA = {
      kind: 'pass.blur.gaussian-separable.v1',
      nodeId: 'n-blur',
      inputWgsl: 'HUGE_A',
      blurWgsl: 'b',
      presentWgsl: 'p',
      intermediateTexture: { size: { kind: 'canvas' }, format: 'rgba8unorm', usage: 0 },
      paramSlots: { amount: 0, radius: 1, type: 2, direction: 3, centerX: 4, centerY: 5 },
    } as WebGpuPassPlan;
    const planB = { ...planA, inputWgsl: 'HUGE_B' } as WebGpuPassPlan;
    expect(hashWgslPassPlanDescriptor(planA)).toBe(hashWgslPassPlanDescriptor(planB));
  });
});
