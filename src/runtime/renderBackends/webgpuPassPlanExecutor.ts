/**
 * Shared WebGPU pass-plan param packing + encode dispatch for preview and export.
 *
 * Callers (preview `WebGpuRenderBackend`, image/video export paths) own device lifecycle,
 * runtime create/destroy, readback, and presentation. This module owns:
 * - packing scalars/vec4s into `array<vec4<f32>>` param slots
 * - graph transfer with runtime-only + connection-suppression policy
 * - dispatching encode to the existing pass-plan runtimes (no forked plan math)
 *
 * Wiring of the three callers: arch-perf-remediation **04B**.
 */

import type { NodeGraph } from '../../data-model/types';
import { isRuntimeOnlyParameter } from '../../utils/runtimeOnlyParams';
import { isParameterUniformSuppressedByConnection } from '../../utils/resolveParameterInputMode';
import type { CompilationResult, UniformMetadata } from '../../compile-contract';
import type { BlurGaussianSeparableV1Runtime } from './blurGaussianSeparablePassPlanRuntime';
import { encodeBlurGaussianSeparableV1Frame } from './blurGaussianSeparablePassPlanRuntime';
import type { GlowBloomV1Runtime } from './glowBloomPassPlanRuntime';
import { encodeGlowBloomV1Frame } from './glowBloomPassPlanRuntime';
import type { BokehV1Runtime } from './bokehPassPlanRuntime';
import { encodeBokehV1Frame } from './bokehPassPlanRuntime';
import type { CrepuscularRaysV1Runtime } from './crepuscularRaysPassPlanRuntime';
import { encodeCrepuscularRaysV1Frame } from './crepuscularRaysPassPlanRuntime';

export type WebGpuParamLayout = CompilationResult['paramLayout'];

export type WebGpuParamValue = number | [number, number, number, number];

export type WebGpuParamSlotUpdate = {
  nodeId: string;
  paramName: string;
  value: WebGpuParamValue;
};

/** Union of the four multipass pass-plan runtimes. */
export type WebGpuPassPlanV1Runtime =
  | BlurGaussianSeparableV1Runtime
  | GlowBloomV1Runtime
  | BokehV1Runtime
  | CrepuscularRaysV1Runtime;

/**
 * Host-owned GPU hooks for one encode. Preview vs offline size / presentation stay here;
 * the executor never imports Svelte or export orchestrators.
 */
export type WebGpuPassPlanEncodeHost = {
  device: GPUDevice;
  queue: GPUQueue;
  width: number;
  height: number;
  presentTargetView: GPUTextureView;
};

export type PackPassPlanParamsOptions = {
  /** Compiler uniforms — seed defaults before graph transfer (preview parity). */
  uniforms?: ReadonlyArray<UniformMetadata>;
  /** Frame/audio overrides applied after graph transfer. */
  uniformUpdates?: ReadonlyArray<WebGpuParamSlotUpdate>;
};

/** Slot count for `array<vec4<f32>>` buffers; at least 1 so empty layouts still allocate. */
export function computeParamSlotCount(layout: WebGpuParamLayout): number {
  const vals = Object.values(layout);
  if (vals.length === 0) return 1;
  let max = 0;
  for (const v of vals) max = Math.max(max, v);
  return max + 1;
}

/** Allocate a zeroed param buffer sized for `layout`. */
export function allocateParamSlotBuffer(layout: WebGpuParamLayout): Float32Array {
  return new Float32Array(computeParamSlotCount(layout) * 4);
}

function toVec4(v: UniformMetadata['defaultValue']): WebGpuParamValue {
  if (typeof v === 'number') return v;
  if (v.length === 4) return v as [number, number, number, number];
  if (v.length === 3) return [v[0], v[1], v[2], 0];
  return [v[0], v[1], 0, 0];
}

/**
 * Write one parameter into the packed `array<vec4<f32>>` buffer.
 * Scalars occupy `.x`; unused components are zeroed. Missing layout keys are no-ops.
 */
export function setParamSlot(
  paramsData: Float32Array,
  layout: WebGpuParamLayout,
  nodeId: string,
  paramName: string,
  value: WebGpuParamValue
): void {
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
}

/** Apply a batch of slot updates (e.g. audio / frame driver uniforms). */
export function applyParamSlotUpdates(
  paramsData: Float32Array,
  layout: WebGpuParamLayout,
  updates: ReadonlyArray<WebGpuParamSlotUpdate>
): void {
  for (const u of updates) {
    setParamSlot(paramsData, layout, u.nodeId, u.paramName, u.value);
  }
}

/**
 * Seed compiler-declared default uniform values into the param buffer.
 *
 * Graphs often omit keys that equal defaults (and old presets omit newly added params).
 * Preview seeds via `applyUniformDefaults` before graph transfer; export must do the same
 * or missing slots stay 0.0 and diverge from preview.
 */
export function applyPassPlanUniformDefaults(
  uniforms: ReadonlyArray<UniformMetadata>,
  layout: WebGpuParamLayout,
  paramsData: Float32Array
): void {
  for (const u of uniforms) {
    setParamSlot(paramsData, layout, u.nodeId, u.paramName, toVec4(u.defaultValue));
  }
}

/**
 * Populate the WebGPU param buffer from the graph, mirroring export WebGL / prior export WebGPU:
 * - skip runtime-only params
 * - if a parameter is connected and its mode is 'override', skip the literal value
 * - pack numeric graph parameters only (same as existing export `transferParametersFromGraph`)
 */
export function transferPassPlanParametersFromGraph(
  graph: NodeGraph,
  layout: WebGpuParamLayout,
  paramsData: Float32Array
): void {
  for (const node of graph.nodes) {
    for (const [paramName, value] of Object.entries(node.parameters)) {
      if (isRuntimeOnlyParameter(node.type, paramName)) continue;
      if (isParameterUniformSuppressedByConnection(graph, node, paramName)) continue;
      if (typeof value === 'number') {
        setParamSlot(paramsData, layout, node.id, paramName, value);
      }
    }
  }
}

/**
 * Fill an existing param buffer: optional compiler defaults → graph → optional updates.
 * Prefer this for export runtimes that already own `paramsData`.
 */
export function fillPassPlanParamsBuffer(
  graph: NodeGraph,
  layout: WebGpuParamLayout,
  paramsData: Float32Array,
  options?: PackPassPlanParamsOptions
): void {
  if (options?.uniforms && options.uniforms.length > 0) {
    applyPassPlanUniformDefaults(options.uniforms, layout, paramsData);
  }
  transferPassPlanParametersFromGraph(graph, layout, paramsData);
  if (options?.uniformUpdates && options.uniformUpdates.length > 0) {
    applyParamSlotUpdates(paramsData, layout, options.uniformUpdates);
  }
}

/**
 * Allocate, optionally seed compiler defaults, transfer graph values, then apply updates.
 * Marks no GPU dirty flag — callers set `paramsDirty` on their runtime.
 *
 * Pass `uniforms` for preview/export parity when graphs omit default-valued keys.
 */
function normalizePackPassPlanParamsOptions(
  options?: PackPassPlanParamsOptions | ReadonlyArray<WebGpuParamSlotUpdate>
): PackPassPlanParamsOptions | undefined {
  if (options == null) return undefined;
  // Legacy callers passed a bare updates array as the 3rd argument.
  if (Array.isArray(options)) {
    return { uniformUpdates: options };
  }
  return options as PackPassPlanParamsOptions;
}

export function packPassPlanParamsFromGraph(
  graph: NodeGraph,
  layout: WebGpuParamLayout,
  options?: PackPassPlanParamsOptions | ReadonlyArray<WebGpuParamSlotUpdate>
): Float32Array {
  const paramsData = allocateParamSlotBuffer(layout);
  fillPassPlanParamsBuffer(graph, layout, paramsData, normalizePackPassPlanParamsOptions(options));
  return paramsData;
}

/** Read `.x` of a packed slot (tests / diagnostics). Missing keys return `undefined`. */
export function readParamSlotScalar(
  paramsData: Float32Array,
  layout: WebGpuParamLayout,
  nodeId: string,
  paramName: string
): number | undefined {
  const idx = layout[`${nodeId}.${paramName}`];
  if (idx == null) return undefined;
  return paramsData[idx * 4];
}

/**
 * Encode one frame for any of the four pass-plan kinds via the existing runtimes.
 * Does not create command encoders beyond what the plan runtimes already own.
 */
export function encodeWebGpuPassPlanFrame(
  host: WebGpuPassPlanEncodeHost,
  rt: WebGpuPassPlanV1Runtime
): void {
  const { device, queue, width, height, presentTargetView } = host;
  // Nested `plan.kind` does not narrow the outer runtime union; cast per arm.
  switch (rt.plan.kind) {
    case 'pass.blur.gaussian-separable.v1':
      encodeBlurGaussianSeparableV1Frame(
        device,
        queue,
        rt as BlurGaussianSeparableV1Runtime,
        width,
        height,
        presentTargetView
      );
      return;
    case 'pass.glow-bloom.v1':
      encodeGlowBloomV1Frame(device, queue, rt as GlowBloomV1Runtime, width, height, presentTargetView);
      return;
    case 'pass.bokeh.v1':
      encodeBokehV1Frame(device, queue, rt as BokehV1Runtime, width, height, presentTargetView);
      return;
    case 'pass.crepuscular-rays.v1':
      encodeCrepuscularRaysV1Frame(
        device,
        queue,
        rt as CrepuscularRaysV1Runtime,
        width,
        height,
        presentTargetView
      );
      return;
    default: {
      const _exhaustive: never = rt.plan;
      void _exhaustive;
      throw new Error('encodeWebGpuPassPlanFrame: unsupported pass-plan runtime');
    }
  }
}
