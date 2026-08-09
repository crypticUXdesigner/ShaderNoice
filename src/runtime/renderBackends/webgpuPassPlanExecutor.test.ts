/**
 * Param-slot packing parity for the shared WebGPU pass-plan executor.
 * Golden expectations match the prior image/video export packing rules
 * (runtime-only skip + connection override suppression + scalar→vec4 slots).
 */
import { describe, expect, it } from 'vitest';
import { NodeShaderCompiler } from '../../shaders/NodeShaderCompiler';
import { nodeSystemSpecs } from '../../shaders/nodes/index';
import type { NodeSpec } from '../../types/nodeSpec';
import type { NodeGraph } from '../../data-model/types';
import type { AudioSetup } from '../../data-model/audioSetupTypes';
import {
  mvpBlurPassPlanGraph,
  mvpGlowBloomPassPlanGraph,
  mvpBokehPassPlanGraph,
  mvpCrepuscularRaysPassPlanGraph,
  mvpAudioBlurPassPlanGraph,
  mvpGenericRaymarcherSierpinskiTetraScaleAudioSetup,
} from '../../validation/webgpuMvpFixtures';
import { isRuntimeOnlyParameter } from '../../utils/runtimeOnlyParams';
import { isParameterUniformSuppressedByConnection } from '../../utils/resolveParameterInputMode';
import {
  allocateParamSlotBuffer,
  applyParamSlotUpdates,
  applyPassPlanUniformDefaults,
  computeParamSlotCount,
  packPassPlanParamsFromGraph,
  readParamSlotScalar,
  setParamSlot,
  transferPassPlanParametersFromGraph,
  type WebGpuParamLayout,
  type WebGpuParamSlotUpdate,
  type WebGpuParamValue,
} from './webgpuPassPlanExecutor';

function buildNodeSpecsMap(): Map<string, NodeSpec> {
  return new Map(nodeSystemSpecs.map((s) => [s.id, s]));
}

function compileWebGpu(graph: NodeGraph, audioSetup: AudioSetup | null = null) {
  const compiler = new NodeShaderCompiler(buildNodeSpecsMap());
  const result = compiler.compile(graph, audioSetup, { backend: 'webgpu' });
  expect(result.backend).toBe('webgpu');
  expect(result.supported).toBe(true);
  expect(result.metadata.errors).toEqual([]);
  return result;
}

/**
 * Independent mirror of the pre-04A export-path packing (golden oracle).
 * Intentionally duplicates the old image/video export helpers so the shared module
 * cannot silently drift without failing this suite.
 */
function legacyExportPack(
  graph: NodeGraph,
  layout: WebGpuParamLayout,
  uniformUpdates?: ReadonlyArray<WebGpuParamSlotUpdate>
): Float32Array {
  const vals = Object.values(layout);
  let slotCount = 1;
  if (vals.length > 0) {
    let max = 0;
    for (const v of vals) max = Math.max(max, v);
    slotCount = max + 1;
  }
  const paramsData = new Float32Array(slotCount * 4);

  const setSlot = (nodeId: string, paramName: string, value: WebGpuParamValue): void => {
    const idx = layout[`${nodeId}.${paramName}`];
    if (idx == null) return;
    const o = idx * 4;
    if (typeof value === 'number') {
      paramsData[o + 0] = value;
      paramsData[o + 1] = 0;
      paramsData[o + 2] = 0;
      paramsData[o + 3] = 0;
      return;
    }
    paramsData[o + 0] = value[0];
    paramsData[o + 1] = value[1];
    paramsData[o + 2] = value[2];
    paramsData[o + 3] = value[3];
  };

  for (const node of graph.nodes) {
    for (const [paramName, value] of Object.entries(node.parameters)) {
      if (isRuntimeOnlyParameter(node.type, paramName)) continue;
      if (isParameterUniformSuppressedByConnection(graph, node, paramName)) continue;
      if (typeof value === 'number') {
        setSlot(node.id, paramName, value);
      }
    }
  }
  if (uniformUpdates) {
    for (const u of uniformUpdates) {
      setSlot(u.nodeId, u.paramName, u.value);
    }
  }
  return paramsData;
}

describe('webgpuPassPlanExecutor param packing', () => {
  it('setParamSlot packs scalars into .x and zeros the rest', () => {
    const layout = { 'n.a': 0, 'n.b': 1 };
    const buf = allocateParamSlotBuffer(layout);
    expect(computeParamSlotCount(layout)).toBe(2);
    setParamSlot(buf, layout, 'n', 'a', 1.25);
    setParamSlot(buf, layout, 'n', 'b', [2, 3, 4, 5]);
    expect(Array.from(buf.subarray(0, 4))).toEqual([1.25, 0, 0, 0]);
    expect(Array.from(buf.subarray(4, 8))).toEqual([2, 3, 4, 5]);
    setParamSlot(buf, layout, 'missing', 'x', 9);
    expect(Array.from(buf)).toEqual([1.25, 0, 0, 0, 2, 3, 4, 5]);
  });

  it('matches legacy export packing for mvp blur / glow / bokeh / crepuscular fixtures', () => {
    const fixtures = [
      mvpBlurPassPlanGraph(),
      mvpGlowBloomPassPlanGraph(),
      mvpBokehPassPlanGraph(),
      mvpCrepuscularRaysPassPlanGraph(),
    ];
    for (const graph of fixtures) {
      const result = compileWebGpu(graph);
      const shared = packPassPlanParamsFromGraph(graph, result.paramLayout);
      const legacy = legacyExportPack(graph, result.paramLayout);
      expect(Array.from(shared), graph.id).toEqual(Array.from(legacy));
    }
  });

  it('packs known blur pass-plan slots from mvpBlurPassPlanGraph', () => {
    const graph = mvpBlurPassPlanGraph();
    const result = compileWebGpu(graph);
    expect(result.webgpuPassPlan?.kind).toBe('pass.blur.gaussian-separable.v1');

    const packed = packPassPlanParamsFromGraph(graph, result.paramLayout);
    expect(readParamSlotScalar(packed, result.paramLayout, 'n-blur', 'blurAmount')).toBe(0.0);
    expect(readParamSlotScalar(packed, result.paramLayout, 'n-blur', 'blurRadius')).toBe(6.0);
    expect(readParamSlotScalar(packed, result.paramLayout, 'n-blur', 'blurType')).toBe(0);
    expect(readParamSlotScalar(packed, result.paramLayout, 'n-blur', 'blurDirection')).toBe(45.0);
    expect(readParamSlotScalar(packed, result.paramLayout, 'n-noise', 'noiseScale')).toBe(2.0);
  });

  it('skips connection-suppressed override params (literal stays unset)', () => {
    const graph: NodeGraph = {
      id: 'fixture-blur-amount-override',
      name: 'blur amount overridden by wire',
      version: '2.0',
      nodes: [
        {
          id: 'n-const',
          type: 'constant-vec4',
          position: { x: 0, y: 0 },
          parameters: { x: 0.5, y: 0.5, z: 0.5, w: 1.0 },
        },
        {
          id: 'n-amt',
          type: 'constant-float',
          position: { x: 0, y: 0 },
          parameters: { value: 0.9 },
        },
        {
          id: 'n-blur',
          type: 'blur',
          position: { x: 0, y: 0 },
          parameters: {
            blurAmount: 0.25,
            blurRadius: 4.0,
            blurType: 0,
            blurDirection: 0,
            blurCenterX: 0,
            blurCenterY: 0,
          },
          parameterInputModes: { blurAmount: 'override' },
        },
        { id: 'n-out', type: 'final-output', position: { x: 0, y: 0 }, parameters: {} },
      ],
      connections: [
        {
          id: 'c-in',
          sourceNodeId: 'n-const',
          sourcePort: 'out',
          targetNodeId: 'n-blur',
          targetPort: 'in',
        },
        {
          id: 'c-amt',
          sourceNodeId: 'n-amt',
          sourcePort: 'out',
          targetNodeId: 'n-blur',
          targetParameter: 'blurAmount',
        },
        {
          id: 'c-out',
          sourceNodeId: 'n-blur',
          sourcePort: 'out',
          targetNodeId: 'n-out',
          targetPort: 'in',
        },
      ],
    };

    const result = compileWebGpu(graph);
    const packed = packPassPlanParamsFromGraph(graph, result.paramLayout);

    // Literal 0.25 must not land in the slot (override wire suppresses it).
    expect(readParamSlotScalar(packed, result.paramLayout, 'n-blur', 'blurAmount')).toBe(0);
    expect(readParamSlotScalar(packed, result.paramLayout, 'n-blur', 'blurRadius')).toBe(4.0);

    const legacy = legacyExportPack(graph, result.paramLayout);
    expect(Array.from(packed)).toEqual(Array.from(legacy));
  });

  it('skips runtime-only params even when present on the node', () => {
    const layout = {
      'pulse.pulseDrive': 0,
      'pulse.frequency': 1,
    };
    const graph: NodeGraph = {
      id: 'runtime-only-pack',
      name: 'runtime-only',
      version: '2.0',
      nodes: [
        {
          id: 'pulse',
          type: 'radial-pulse',
          position: { x: 0, y: 0 },
          parameters: {
            pulseDrive: 1.0,
            frequency: 2.5,
          },
        },
      ],
      connections: [],
    };
    const buf = allocateParamSlotBuffer(layout);
    transferPassPlanParametersFromGraph(graph, layout, buf);
    expect(readParamSlotScalar(buf, layout, 'pulse', 'pulseDrive')).toBe(0);
    expect(readParamSlotScalar(buf, layout, 'pulse', 'frequency')).toBe(2.5);
  });

  it('applies uniformUpdates after graph transfer (audio-style overrides)', () => {
    const graph = mvpAudioBlurPassPlanGraph();
    const audioSetup = mvpGenericRaymarcherSierpinskiTetraScaleAudioSetup();
    const result = compileWebGpu(graph, audioSetup);
    const updates = [
      { nodeId: 'n-blur-stab', paramName: 'blurAmount', value: 0.75 as const },
      { nodeId: 'remap-mvp-stetra-audio-scale', paramName: 'out', value: 0.5 as const },
    ];
    const packed = packPassPlanParamsFromGraph(graph, result.paramLayout, { uniformUpdates: updates });
    expect(readParamSlotScalar(packed, result.paramLayout, 'n-blur-stab', 'blurAmount')).toBe(0.75);
    expect(result.paramLayout['remap-mvp-stetra-audio-scale.out']).toBeTypeOf('number');
    expect(
      readParamSlotScalar(packed, result.paramLayout, 'remap-mvp-stetra-audio-scale', 'out')
    ).toBe(0.5);

    const legacy = legacyExportPack(graph, result.paramLayout, updates);
    expect(Array.from(packed)).toEqual(Array.from(legacy));
  });

  it('seeds compiler defaults for omitted graph parameters (preview/export parity)', () => {
    // blurRadius default is 5.0; omit it so graph-only packing would leave the slot at 0.
    const full = mvpBlurPassPlanGraph();
    const blurNode = full.nodes.find((n) => n.id === 'n-blur');
    expect(blurNode).toBeTruthy();
    const { blurRadius: _omit, ...paramsWithoutRadius } = blurNode!.parameters;
    void _omit;
    const graph: NodeGraph = {
      ...full,
      nodes: full.nodes.map((n) =>
        n.id === 'n-blur' ? { ...n, parameters: paramsWithoutRadius } : n
      ),
    };

    const result = compileWebGpu(graph);
    expect(result.paramLayout['n-blur.blurRadius']).toBeTypeOf('number');
    const blurRadiusUniform = result.uniforms.find(
      (u) => u.nodeId === 'n-blur' && u.paramName === 'blurRadius'
    );
    expect(blurRadiusUniform?.defaultValue).toBe(5);

    const withoutDefaults = packPassPlanParamsFromGraph(graph, result.paramLayout);
    expect(readParamSlotScalar(withoutDefaults, result.paramLayout, 'n-blur', 'blurRadius')).toBe(0);

    const withDefaults = packPassPlanParamsFromGraph(graph, result.paramLayout, {
      uniforms: result.uniforms,
    });
    expect(readParamSlotScalar(withDefaults, result.paramLayout, 'n-blur', 'blurRadius')).toBe(5);

    // Defaults alone match UniformMetadata; graph transfer must not wipe them when key is absent.
    const buf = allocateParamSlotBuffer(result.paramLayout);
    applyPassPlanUniformDefaults(result.uniforms, result.paramLayout, buf);
    transferPassPlanParametersFromGraph(graph, result.paramLayout, buf);
    expect(readParamSlotScalar(buf, result.paramLayout, 'n-blur', 'blurRadius')).toBe(5);
  });

  it('applyParamSlotUpdates batches writes', () => {
    const layout = { 'a.x': 0, 'a.y': 1 };
    const buf = allocateParamSlotBuffer(layout);
    applyParamSlotUpdates(buf, layout, [
      { nodeId: 'a', paramName: 'x', value: 3 },
      { nodeId: 'a', paramName: 'y', value: [1, 2, 3, 4] },
    ]);
    expect(Array.from(buf)).toEqual([3, 0, 0, 0, 1, 2, 3, 4]);
  });
});
