import { describe, it, expect } from 'vitest';
import { NodeShaderCompiler } from '../NodeShaderCompiler';
import { nodeSystemSpecs } from './index';
import type { NodeGraph } from '../../data-model/types';
import type { NodeSpec } from '../../types/nodeSpec';
import {
  pixelizeMix,
  pixelizeNodeSpec,
  pixelizeQuantize,
  pixelizeSnapAxis,
  pixelizeSnapCoord,
} from './pixelize';

function buildNodeSpecsMap(): Map<string, NodeSpec> {
  return new Map(nodeSystemSpecs.map((s) => [s.id, s]));
}

function buildPixelizeGraph(): NodeGraph {
  return {
    id: 'graph-pixelize-smoke',
    name: 'Pixelize smoke',
    version: '2.0',
    nodes: [
      { id: 'n-uv', type: 'uv-coordinates', position: { x: 0, y: 0 }, parameters: {} },
      { id: 'n-px', type: 'pixelize', position: { x: 0, y: 0 }, parameters: {} },
      { id: 'n-noise', type: 'noise', position: { x: 0, y: 0 }, parameters: {} },
      { id: 'n-out', type: 'final-output', position: { x: 0, y: 0 }, parameters: {} },
    ],
    connections: [
      { id: 'c1', sourceNodeId: 'n-uv', sourcePort: 'out', targetNodeId: 'n-px', targetPort: 'in' },
      { id: 'c2', sourceNodeId: 'n-px', sourcePort: 'out', targetNodeId: 'n-noise', targetPort: 'in' },
      { id: 'c3', sourceNodeId: 'n-noise', sourcePort: 'out', targetNodeId: 'n-out', targetPort: 'in' },
    ],
  };
}

describe('pixelizeSnapCoord', () => {
  const q: [number, number] = [3.7, -1.2];

  it('floor snap matches floor per axis', () => {
    expect(pixelizeSnapCoord(q, 0)).toEqual([3, -2]);
  });

  it('center snap matches floor(q + 0.5)', () => {
    expect(pixelizeSnapCoord(q, 1)).toEqual([4, -1]);
  });

  it('round snap matches Math.round', () => {
    expect(pixelizeSnapCoord(q, 2)).toEqual([
      pixelizeSnapAxis(q[0], 2),
      pixelizeSnapAxis(q[1], 2),
    ]);
  });
});

describe('pixelizeQuantize', () => {
  it('returns input-scale coords for floor snap at 40 cells (preset parity)', () => {
    const p: [number, number] = [0.37, 0.82];
    expect(pixelizeQuantize(p, [40, 40], [0, 0], 0)).toEqual([
      Math.floor(p[0] * 40) / 40,
      Math.floor(p[1] * 40) / 40,
    ]);
  });

  it('clamps cells to at least 1', () => {
    expect(pixelizeQuantize([0.5, 0.5], [0, -3], [0, 0], 0)).toEqual([0, 0]);
  });
});

describe('pixelizeMix', () => {
  it('returns input unchanged when amount is 0', () => {
    const inUv: [number, number] = [0.2, 0.8];
    const snapped: [number, number] = [0.25, 0.75];
    expect(pixelizeMix(inUv, snapped, 0)).toEqual(inUv);
  });

  it('returns snapped when amount is 1', () => {
    const inUv: [number, number] = [0.2, 0.8];
    const snapped: [number, number] = [0.25, 0.75];
    expect(pixelizeMix(inUv, snapped, 1)).toEqual(snapped);
  });
});

describe('pixelizeNodeSpec', () => {
  it('includes snap and screen-space helpers in GLSL functions', () => {
    expect(pixelizeNodeSpec.functions).toContain('pixelizeSnapCoord');
    expect(pixelizeNodeSpec.functions).toContain('pixelizeScreenNorm');
    expect(pixelizeNodeSpec.functions).toContain('pixelizeScreenToUv');
    expect(pixelizeNodeSpec.mainCode).toContain('mix(inUv, snapped, amt)');
  });
});

describe('pixelize compile', () => {
  const compiler = new NodeShaderCompiler(buildNodeSpecsMap());

  it('compiles UV → Pixelize → Noise → Final Output', () => {
    const result = compiler.compile(buildPixelizeGraph());
    expect(result.metadata.errors).toHaveLength(0);
    expect(result.shaderCode).toContain('pixelizeSnapCoord');
    expect(result.shaderCode).toContain('// Node: Pixelize (n-px)');
  });
});

describe('pixelize WebGPU compile', () => {
  const compiler = new NodeShaderCompiler(buildNodeSpecsMap());

  function buildMinimalWgslGraph(parameters: Record<string, number> = {}): NodeGraph {
    return {
      id: 'graph-pixelize-wgsl',
      name: 'Pixelize WGSL',
      version: '2.0',
      nodes: [
        { id: 'n-uv', type: 'uv-coordinates', position: { x: 0, y: 0 }, parameters: {} },
        {
          id: 'n-px',
          type: 'pixelize',
          position: { x: 0, y: 0 },
          parameters,
        },
        { id: 'n-out', type: 'final-output', position: { x: 0, y: 0 }, parameters: {} },
      ],
      connections: [
        { id: 'c1', sourceNodeId: 'n-uv', sourcePort: 'out', targetNodeId: 'n-px', targetPort: 'in' },
        { id: 'c2', sourceNodeId: 'n-px', sourcePort: 'out', targetNodeId: 'n-out', targetPort: 'in' },
      ],
    };
  }

  it('compiles UV → Pixelize → Final Output at defaults', () => {
    const result = compiler.compile(structuredClone(buildMinimalWgslGraph()), null, { backend: 'webgpu' });
    expect(result.supported).toBe(true);
    expect(result.metadata.errors).toHaveLength(0);
    expect(result.code).toContain('pixelizeSnapCoord');
    expect(result.code).toContain('mix(');
  });

  it('emits screen-space and snap helpers for Space / Snap params', () => {
    const result = compiler.compile(
      structuredClone(buildMinimalWgslGraph({ pixelizeSpace: 1, pixelizeSnap: 2 })),
      null,
      { backend: 'webgpu' },
    );
    expect(result.supported).toBe(true);
    expect(result.code).toContain('pixelizeScreenNorm');
    expect(result.code).toContain('pixelizeScreenToUv');
    expect(result.code).toContain('round(q)');
    expect(result.code).toContain('globals.v0.x');
  });
});
