import type { Connection, NodeGraph, NodeInstance } from '../data-model/types';
import type { ParameterInputMode, ParameterSpec } from '../types/nodeSpec';
import { isVirtualNodeId } from './virtualNodes';

/** Virtual audio-signal wire on a parameter port (remap or raw band). */
export function isAudioVirtualDriverConnection(
  connection: Pick<Connection, 'sourceNodeId' | 'sourcePort'>
): boolean {
  return isVirtualNodeId(connection.sourceNodeId) && connection.sourcePort === 'out';
}

/** Enabled graph wire targeting `(nodeId, paramName)`, if any. Bypassed connections are ignored. */
export function findActiveParameterConnection(
  graph: NodeGraph,
  nodeId: string,
  paramName: string
): Connection | undefined {
  return graph.connections.find(
    (c) =>
      !c.disabled &&
      c.targetNodeId === nodeId &&
      c.targetParameter === paramName
  );
}

/**
 * True when an active connection fully replaces the parameter uniform (override semantics).
 * Disabled / bypassed connections do not suppress the uniform.
 */
export function isParameterUniformSuppressedByConnection(
  graph: NodeGraph,
  node: NodeInstance,
  paramName: string,
  paramSpec?: ParameterSpec
): boolean {
  const connection = findActiveParameterConnection(graph, node.id, paramName);
  if (!connection) return false;
  return resolveParameterInputMode(node, paramName, paramSpec, connection) === 'override';
}

/**
 * Effective input mode for a parameter wire.
 * Audio driver virtual wires always override — remapped output is assigned directly;
 * target-range handles scaling; multiply/add modes apply only to graph wires.
 */
export function resolveParameterInputMode(
  node: NodeInstance,
  paramName: string,
  paramSpec: ParameterSpec | undefined,
  connection: Pick<Connection, 'sourceNodeId' | 'sourcePort'> | undefined
): ParameterInputMode {
  if (connection && isAudioVirtualDriverConnection(connection)) {
    return 'override';
  }
  return node.parameterInputModes?.[paramName] ?? paramSpec?.inputMode ?? 'override';
}
