/**
 * GLSL section hashing / codegen digests for incremental hash-skip (arch-perf-followups 04A).
 * Shared helpers are intentionally backend-agnostic so 04B can mirror the same aggregate pattern.
 */

import type { AudioSetup } from '../../data-model/audioSetupTypes';
import type { NodeGraph, ParameterValue } from '../../data-model/types';
import type { GlslSectionHashes, ParamLayout } from '../../compile-contract';
import type { NodeSpec } from '../../types/nodeSpec';

/** Test / dev counters: hash-skip vs full GLSL emit inside `compileIncremental`. */
export const glslIncrementalEmitStats = {
  hashSkips: 0,
  fullEmits: 0,
};

export function resetGlslIncrementalEmitStats(): void {
  glslIncrementalEmitStats.hashSkips = 0;
  glslIncrementalEmitStats.fullEmits = 0;
}

function fnv1a(text: string, seed: number): string {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Stable dual FNV-1a digest (collision-resistant enough for emit skip keys). */
export function hashUtf8(text: string): string {
  return `${fnv1a(text, 2166136261)}:${fnv1a(text, 0x811c9dc5)}`;
}

function serializeParamValue(value: ParameterValue | undefined): string {
  if (value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

function serializeParameterInputModes(
  modes: NodeGraph['nodes'][number]['parameterInputModes']
): string {
  if (!modes) return '';
  const keys = Object.keys(modes).sort();
  return keys.map((k) => `${k}=${modes[k] ?? ''}`).join(',');
}

/**
 * Codegen-input digest for a bypass-aware compile slice.
 * Uniform-backed numeric/color params contribute only `@u` (value changes do not affect GLSL).
 * String/array and non-uniform params contribute their values (baked into emit).
 */
export function computeGlslCodegenDigest(args: {
  /** Graph whose `connections` are the compile-time (bypass-aware) set. */
  compileGraph: NodeGraph;
  compileExecutionOrder: string[];
  nodeSpecs: Map<string, NodeSpec>;
  uniformNames: Map<string, string>;
  audioSetup?: AudioSetup | null;
}): string {
  const { compileGraph, compileExecutionOrder, nodeSpecs, uniformNames, audioSetup } = args;
  const parts: string[] = [];

  parts.push(`order:${compileExecutionOrder.join(',')}`);

  const nodeById = new Map(compileGraph.nodes.map((n) => [n.id, n]));
  for (const nodeId of compileExecutionOrder) {
    const node = nodeById.get(nodeId);
    if (!node) {
      parts.push(`missing:${nodeId}`);
      continue;
    }
    const spec = nodeSpecs.get(node.type);
    parts.push(`node:${node.id}|${node.type}|byp=${node.bypassed === true ? 1 : 0}`);
    parts.push(`modes:${serializeParameterInputModes(node.parameterInputModes)}`);

    if (spec) {
      const paramNames = Object.keys(spec.parameters).sort();
      for (const paramName of paramNames) {
        const paramSpec = spec.parameters[paramName];
        if (!paramSpec) continue;
        const key = `${node.id}.${paramName}`;
        if (paramSpec.type === 'string' || paramSpec.type === 'array') {
          parts.push(`p:${paramName}=${serializeParamValue(node.parameters[paramName] as ParameterValue | undefined)}`);
          continue;
        }
        if (uniformNames.has(key)) {
          parts.push(`p:${paramName}=@u`);
        } else {
          parts.push(`p:${paramName}=${serializeParamValue(node.parameters[paramName] as ParameterValue | undefined)}`);
        }
      }
    } else {
      const keys = Object.keys(node.parameters).sort();
      for (const k of keys) {
        parts.push(`p:${k}=${serializeParamValue(node.parameters[k] as ParameterValue | undefined)}`);
      }
    }
  }

  const connKeys = compileGraph.connections
    .map((c) => {
      const outMin = c.driverOutMin ?? '';
      const outMax = c.driverOutMax ?? '';
      return [
        c.id,
        c.sourceNodeId,
        c.sourcePort,
        c.targetNodeId,
        c.targetPort ?? '',
        c.targetParameter ?? '',
        c.disabled ? '1' : '0',
        String(outMin),
        String(outMax),
      ].join('>');
    })
    .sort();
  parts.push(`conns:${connKeys.join(';')}`);

  if (compileGraph.automation) {
    parts.push(`auto:${JSON.stringify(compileGraph.automation)}`);
  } else {
    parts.push('auto:');
  }

  if (audioSetup) {
    const bandIds = (audioSetup.bands ?? []).map((b) => b.id).sort();
    const remapIds = (audioSetup.remappers ?? []).map((r) => r.id).sort();
    const fileIds = (audioSetup.files ?? []).map((f) => f.id).sort();
    parts.push(`audio:bands=${bandIds.join(',')};remap=${remapIds.join(',')};files=${fileIds.join(',')}`);
    if (audioSetup.arrangementSnapshot) {
      parts.push(`arr:${hashUtf8(JSON.stringify(audioSetup.arrangementSnapshot))}`);
    }
  } else {
    parts.push('audio:');
  }

  return hashUtf8(parts.join('\n'));
}

export function hashUniformsLayout(uniformNames: Map<string, string>): string {
  const keys = [...uniformNames.keys()].sort();
  return hashUtf8(keys.map((k) => `${k}=${uniformNames.get(k)}`).join('|'));
}

export function hashParamLayout(paramLayout: ParamLayout): string {
  const keys = Object.keys(paramLayout).sort();
  return hashUtf8(keys.map((k) => `${k}:${paramLayout[k]}`).join('|'));
}

export function buildGlslSectionHashes(args: {
  aggregate: string;
  shaderCode: string;
  uniformNames: Map<string, string>;
  paramLayout: ParamLayout;
  nodeBodies?: Record<string, string>;
}): GlslSectionHashes {
  const nodeBodiesHashed: Record<string, string> | undefined = args.nodeBodies
    ? Object.fromEntries(
        Object.entries(args.nodeBodies)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([id, body]) => [id, hashUtf8(body)])
      )
    : undefined;

  return {
    aggregate: args.aggregate,
    shaderContent: hashUtf8(args.shaderCode),
    uniformsLayout: hashUniformsLayout(args.uniformNames),
    paramLayout: hashParamLayout(args.paramLayout),
    ...(nodeBodiesHashed && Object.keys(nodeBodiesHashed).length > 0
      ? { nodeBodies: nodeBodiesHashed }
      : {}),
  };
}

export function cloneGlslSectionHashes(hashes: GlslSectionHashes): GlslSectionHashes {
  return {
    aggregate: hashes.aggregate,
    ...(hashes.shaderContent != null ? { shaderContent: hashes.shaderContent } : {}),
    ...(hashes.uniformsLayout != null ? { uniformsLayout: hashes.uniformsLayout } : {}),
    ...(hashes.paramLayout != null ? { paramLayout: hashes.paramLayout } : {}),
    ...(hashes.nodeBodies != null ? { nodeBodies: { ...hashes.nodeBodies } } : {}),
  };
}
