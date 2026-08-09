/**
 * Drop graph wires whose audio virtual source no longer exists in audioSetup
 * (e.g. remapper or band deleted from the driver panel).
 */

import type { NodeGraph } from './types';
import type { AudioSetup } from './audioSetupTypes';
import { removeConnections } from './immutableUpdates';
import { getVirtualNodeIdsFromAudioSetup, isVirtualNodeId } from './virtualNodes';

export function removeStaleVirtualAudioConnections(
  graph: NodeGraph,
  audioSetup: AudioSetup
): NodeGraph {
  const validSourceIds = new Set(getVirtualNodeIdsFromAudioSetup(audioSetup));
  const hasStale = graph.connections.some(
    (c) => isVirtualNodeId(c.sourceNodeId) && !validSourceIds.has(c.sourceNodeId)
  );
  if (!hasStale) return graph;
  return removeConnections(
    graph,
    (c) => isVirtualNodeId(c.sourceNodeId) && !validSourceIds.has(c.sourceNodeId)
  );
}
