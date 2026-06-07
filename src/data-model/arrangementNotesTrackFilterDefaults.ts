import { EMPTY_ARRANGEMENT_TRACK_FILTER } from '../audiotool/arrangement/arrangementTrackFilter';
import type { ArrangementSnapshot } from '../audiotool/arrangement/types';
import type { NodeGraph, NodeInstance } from './types';

const NOTES_NODE_TYPE = 'arrangement-notes';

/** True when the node still uses legacy “all tracks” (mode 0). */
export function arrangementNotesNeedsDefaultTrackFilter(node: NodeInstance): boolean {
  if (node.type !== NOTES_NODE_TYPE) return false;
  const mode = Number(node.parameters.trackFilterMode ?? 0);
  return mode !== 1;
}

export function applyArrangementNotesDefaultTrackFilterToNode(
  node: NodeInstance,
  _snapshot: ArrangementSnapshot | undefined
): NodeInstance {
  if (!arrangementNotesNeedsDefaultTrackFilter(node)) return node;
  return {
    ...node,
    parameters: {
      ...node.parameters,
      ...EMPTY_ARRANGEMENT_TRACK_FILTER,
    },
  };
}

export function applyArrangementNotesDefaultTrackFilterToGraph(
  graph: NodeGraph,
  snapshot: ArrangementSnapshot | undefined
): NodeGraph {
  let changed = false;
  const nodes = graph.nodes.map((node) => {
    const next = applyArrangementNotesDefaultTrackFilterToNode(node, snapshot);
    if (next !== node) changed = true;
    return next;
  });
  return changed ? { ...graph, nodes } : graph;
}
