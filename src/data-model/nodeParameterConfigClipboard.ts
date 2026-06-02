/**
 * Copy/paste for node parameter configuration (stored values + input modes).
 */

import type { ParameterInputMode, ParameterSpec } from '../types/nodeSpec';
import type { NodeGraph, NodeInstance, ParameterValue } from './types';
import { updateNode } from './immutableUpdates';
import { clampParameterValue, coerceParameterValue } from './utils';

export const NODE_PARAMETER_CONFIG_FORMAT = 'shadernoice-node-parameter-config' as const;
export const NODE_PARAMETER_CONFIG_VERSION = 1 as const;

export interface NodeParameterConfigSnapshot {
  format: typeof NODE_PARAMETER_CONFIG_FORMAT;
  version: typeof NODE_PARAMETER_CONFIG_VERSION;
  nodeType: string;
  parameters: Record<string, ParameterValue>;
  parameterInputModes?: Record<string, ParameterInputMode>;
}

let memoryClipboard: NodeParameterConfigSnapshot | null = null;

export function getNodeParameterConfigClipboard(): NodeParameterConfigSnapshot | null {
  return memoryClipboard;
}

export function setNodeParameterConfigClipboard(snapshot: NodeParameterConfigSnapshot): void {
  memoryClipboard = snapshot;
}

export function clearNodeParameterConfigClipboard(): void {
  memoryClipboard = null;
}

export function isNodeParameterConfigClipboardPayload(
  value: unknown
): value is NodeParameterConfigSnapshot {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    o.format === NODE_PARAMETER_CONFIG_FORMAT &&
    o.version === NODE_PARAMETER_CONFIG_VERSION &&
    typeof o.nodeType === 'string' &&
    o.nodeType.length > 0 &&
    typeof o.parameters === 'object' &&
    o.parameters !== null &&
    !Array.isArray(o.parameters)
  );
}

/**
 * Stored parameter values (and per-param input modes) from a node instance.
 */
export function extractNodeParameterConfig(
  node: NodeInstance,
  parameterSpecs: Record<string, ParameterSpec>
): NodeParameterConfigSnapshot {
  const parameters: Record<string, ParameterValue> = {};
  for (const paramName of Object.keys(node.parameters)) {
    if (!(paramName in parameterSpecs)) continue;
    parameters[paramName] = node.parameters[paramName];
  }

  const parameterInputModes: Record<string, ParameterInputMode> = {};
  if (node.parameterInputModes) {
    for (const paramName of Object.keys(parameters)) {
      const mode = node.parameterInputModes[paramName];
      if (mode !== undefined) parameterInputModes[paramName] = mode;
    }
  }

  return {
    format: NODE_PARAMETER_CONFIG_FORMAT,
    version: NODE_PARAMETER_CONFIG_VERSION,
    nodeType: node.type,
    parameters,
    ...(Object.keys(parameterInputModes).length > 0 ? { parameterInputModes } : {}),
  };
}

function normalizeParameterValue(
  value: unknown,
  paramSpec: ParameterSpec
): ParameterValue {
  let coerced = coerceParameterValue(value, paramSpec.type);
  if (paramSpec.type === 'float' || paramSpec.type === 'int') {
    if (typeof coerced === 'number') {
      coerced = clampParameterValue(coerced, paramSpec.min, paramSpec.max);
      if (paramSpec.type === 'int') coerced = Math.round(coerced);
    }
  }
  return coerced;
}

/**
 * Partial apply: only keys present in `config.parameters` are updated; other params untouched.
 */
export function applyNodeParameterConfig(
  graph: NodeGraph,
  nodeId: string,
  config: NodeParameterConfigSnapshot,
  parameterSpecs: Record<string, ParameterSpec>
): NodeGraph {
  return updateNode(graph, nodeId, (node) => {
    if (node.type !== config.nodeType) return node;

    const newParameters = { ...node.parameters };
    for (const [paramName, raw] of Object.entries(config.parameters)) {
      const paramSpec = parameterSpecs[paramName];
      if (!paramSpec) continue;
      newParameters[paramName] = normalizeParameterValue(raw, paramSpec);
    }

    let newModes = node.parameterInputModes ? { ...node.parameterInputModes } : undefined;
    if (config.parameterInputModes) {
      for (const [paramName, mode] of Object.entries(config.parameterInputModes)) {
        if (!(paramName in config.parameters)) continue;
        if (!parameterSpecs[paramName]) continue;
        if (!newModes) newModes = {};
        newModes[paramName] = mode;
      }
    }

    return {
      ...node,
      parameters: newParameters,
      ...(newModes !== undefined ? { parameterInputModes: newModes } : {}),
    };
  });
}

export function applyNodeParameterConfigToNodes(
  graph: NodeGraph,
  nodeIds: readonly string[],
  config: NodeParameterConfigSnapshot,
  parameterSpecs: Record<string, ParameterSpec>
): NodeGraph {
  let next = graph;
  for (const nodeId of nodeIds) {
    next = applyNodeParameterConfig(next, nodeId, config, parameterSpecs);
  }
  return next;
}

export function resolvePasteTargetNodeIds(
  graph: NodeGraph,
  contextNodeId: string,
  clipboardNodeType: string
): string[] {
  const selected = graph.viewState?.selectedNodeIds ?? [];
  const ids = new Set<string>();
  for (const id of selected) {
    const n = graph.nodes.find((node) => node.id === id);
    if (n?.type === clipboardNodeType) ids.add(id);
  }
  const contextNode = graph.nodes.find((n) => n.id === contextNodeId);
  if (contextNode?.type === clipboardNodeType) ids.add(contextNodeId);
  return [...ids];
}

export function serializeNodeParameterConfig(snapshot: NodeParameterConfigSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function parseNodeParameterConfig(json: string): NodeParameterConfigSnapshot | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!isNodeParameterConfigClipboardPayload(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
