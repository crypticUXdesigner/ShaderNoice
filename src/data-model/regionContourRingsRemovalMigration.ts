/**
 * Removes retired `region-contour-rings` nodes from saved graphs so legacy projects still load.
 */

import type { Connection, NodeGraph } from './types';
import { isParameterConnection, isPortConnection } from './connectionUtils';
import { generateConnectionId, getConnectionIds } from './utils';

export const LEGACY_REGION_CONTOUR_RINGS_NODE_TYPE = 'region-contour-rings' as const;

function spliceOneRegionContourRingsNode(graph: NodeGraph, nodeId: string): NodeGraph {
  const incoming = graph.connections.find(
    (c) => c.targetNodeId === nodeId && c.targetPort === 'in'
  );
  const outgoing = graph.connections.filter(
    (c) => c.sourceNodeId === nodeId && c.sourcePort === 'out'
  );

  const connectionsWithout = graph.connections.filter(
    (c) => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId
  );

  const idSet = getConnectionIds({ ...graph, connections: connectionsWithout });
  const bridges: Connection[] = [];

  if (incoming) {
    for (const out of outgoing) {
      const mergedDisabled = !!(incoming.disabled || out.disabled);
      const id = generateConnectionId(idSet);
      idSet.add(id);
      const base: Connection = {
        id,
        sourceNodeId: incoming.sourceNodeId,
        sourcePort: incoming.sourcePort,
        targetNodeId: out.targetNodeId,
      };

      let conn: Connection;
      if (isPortConnection(out)) {
        conn = { ...base, targetPort: out.targetPort };
      } else if (isParameterConnection(out)) {
        conn = { ...base, targetParameter: out.targetParameter };
      } else {
        continue;
      }
      if (mergedDisabled) {
        conn = { ...conn, disabled: true };
      }
      bridges.push(conn);
    }
  }

  const nodes = graph.nodes.filter((n) => n.id !== nodeId);
  const removedIds = new Set([nodeId]);

  let automation = graph.automation;
  if (automation) {
    const lanes = automation.lanes.filter((l) => !removedIds.has(l.nodeId));
    if (lanes.length !== automation.lanes.length) {
      automation = { ...automation, lanes };
    }
  }

  let viewState = graph.viewState;
  if (viewState?.selectedNodeIds?.length) {
    const nextSel = viewState.selectedNodeIds.filter((id) => !removedIds.has(id));
    if (nextSel.length !== viewState.selectedNodeIds.length) {
      viewState = {
        ...viewState,
        ...(nextSel.length > 0 ? { selectedNodeIds: nextSel } : { selectedNodeIds: undefined }),
      };
    }
  }

  return {
    ...graph,
    nodes,
    connections: [...connectionsWithout, ...bridges],
    ...(automation !== undefined ? { automation } : {}),
    ...(viewState !== undefined ? { viewState } : {}),
  };
}

export function migrateRemoveRegionContourRingsNodes(graph: NodeGraph): NodeGraph {
  let next = graph;
  while (next.nodes.some((n) => n.type === LEGACY_REGION_CONTOUR_RINGS_NODE_TYPE)) {
    const victim = next.nodes.find((n) => n.type === LEGACY_REGION_CONTOUR_RINGS_NODE_TYPE)!;
    next = spliceOneRegionContourRingsNode(next, victim.id);
  }
  return next;
}
