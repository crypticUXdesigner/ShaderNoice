import { describe, it, expect } from 'vitest';
import { hashUtf8, computeGlslCodegenDigest } from './glslSectionHashes';
import type { NodeGraph } from '../../data-model/types';
import type { NodeSpec } from '../../types/nodeSpec';

describe('glslSectionHashes', () => {
  it('hashUtf8 is stable', () => {
    expect(hashUtf8('abc')).toBe(hashUtf8('abc'));
    expect(hashUtf8('abc')).not.toBe(hashUtf8('abd'));
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
    const a = computeGlslCodegenDigest({
      compileGraph: graphA,
      compileExecutionOrder: ['n1'],
      nodeSpecs: specs,
      uniformNames,
    });
    const b = computeGlslCodegenDigest({
      compileGraph: graphB,
      compileExecutionOrder: ['n1'],
      nodeSpecs: specs,
      uniformNames,
    });
    expect(a).toBe(b);
  });
});
