/**
 * WGSL / WebGPU section hashing for incremental hash-skip (arch-perf-followups 04B).
 * Reuses GLSL codegen digests; adds an explicit pass-plan input fingerprint so skip is
 * safe for multi-pass graphs without shipping `inputWgsl` / effect module source.
 */

import type { AudioSetup } from '../../data-model/audioSetupTypes';
import type { NodeGraph } from '../../data-model/types';
import type { ParamLayout, WebGpuPassPlan, WgslSectionHashes } from '../../compile-contract';
import type { NodeSpec } from '../../types/nodeSpec';
import {
  computeGlslCodegenDigest,
  hashParamLayout,
  hashUniformsLayout,
  hashUtf8,
} from './glslSectionHashes';
import { WGSL_WEBGPU_PASS_PLAN_NODE_TYPES } from './wgslPassPlanNodeTypes';

/** Test / dev counters: hash-skip vs full WGSL emit inside `compileIncremental`. */
export const wgslIncrementalEmitStats = {
  hashSkips: 0,
  fullEmits: 0,
};

export function resetWgslIncrementalEmitStats(): void {
  wgslIncrementalEmitStats.hashSkips = 0;
  wgslIncrementalEmitStats.fullEmits = 0;
}

/**
 * Pass-plan topology fingerprint (kind candidates + wiring to final-output).
 * Does not include effect WGSL blobs — those are fixed per kind at emit time.
 */
export function fingerprintWgslPassPlanInputs(args: {
  compileGraph: NodeGraph;
  compileExecutionOrder: string[];
}): string {
  const { compileGraph, compileExecutionOrder } = args;
  const nodeById = new Map(compileGraph.nodes.map((n) => [n.id, n]));
  const finalOutId =
    compileExecutionOrder.find((id) => nodeById.get(id)?.type === 'final-output') ?? null;

  const parts: string[] = [];
  for (const nodeId of compileExecutionOrder) {
    const node = nodeById.get(nodeId);
    if (!node || !WGSL_WEBGPU_PASS_PLAN_NODE_TYPES.has(node.type)) continue;
    const wiredToFinal =
      finalOutId != null &&
      compileGraph.connections.some(
        (c) =>
          c.sourceNodeId === nodeId &&
          c.sourcePort === 'out' &&
          c.targetNodeId === finalOutId &&
          c.targetPort === 'in' &&
          !c.disabled
      );
    parts.push(`${node.type}@${nodeId}>final=${wiredToFinal ? 1 : 0}`);
  }
  return parts.length > 0 ? parts.join(';') : 'none';
}

/**
 * Codegen-input digest for WebGPU/WGSL (bypass-aware slice + pass-plan topology).
 * Uniform-backed params contribute `@u` via {@link computeGlslCodegenDigest}.
 */
export function computeWgslCodegenDigest(args: {
  compileGraph: NodeGraph;
  compileExecutionOrder: string[];
  nodeSpecs: Map<string, NodeSpec>;
  uniformNames: Map<string, string>;
  audioSetup?: AudioSetup | null;
}): string {
  const base = computeGlslCodegenDigest(args);
  const passPlan = fingerprintWgslPassPlanInputs({
    compileGraph: args.compileGraph,
    compileExecutionOrder: args.compileExecutionOrder,
  });
  return hashUtf8(`wgsl|${base}|pass:${passPlan}`);
}

/** Compact pass-plan descriptor hash (no `inputWgsl` / effect module source). */
export function hashWgslPassPlanDescriptor(plan: WebGpuPassPlan | undefined): string | undefined {
  if (!plan) return undefined;
  const slots =
    'paramSlots' in plan && plan.paramSlots
      ? Object.keys(plan.paramSlots)
          .sort()
          .map((k) => `${k}=${(plan.paramSlots as Record<string, number>)[k]}`)
          .join(',')
      : '';
  return hashUtf8(`${plan.kind}|${plan.nodeId}|slots:${slots}`);
}

export function buildWgslSectionHashes(args: {
  aggregate: string;
  wgslCode: string;
  uniformNames: Map<string, string>;
  paramLayout: ParamLayout;
  passPlan?: WebGpuPassPlan;
}): WgslSectionHashes {
  const passPlan = hashWgslPassPlanDescriptor(args.passPlan);
  return {
    aggregate: args.aggregate,
    shaderContent: hashUtf8(args.wgslCode),
    uniformsLayout: hashUniformsLayout(args.uniformNames),
    paramLayout: hashParamLayout(args.paramLayout),
    ...(passPlan != null ? { passPlan } : {}),
  };
}

export function cloneWgslSectionHashes(hashes: WgslSectionHashes): WgslSectionHashes {
  return {
    aggregate: hashes.aggregate,
    ...(hashes.shaderContent != null ? { shaderContent: hashes.shaderContent } : {}),
    ...(hashes.uniformsLayout != null ? { uniformsLayout: hashes.uniformsLayout } : {}),
    ...(hashes.paramLayout != null ? { paramLayout: hashes.paramLayout } : {}),
    ...(hashes.passPlan != null ? { passPlan: hashes.passPlan } : {}),
  };
}
