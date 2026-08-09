/**
 * Hub / preset bootstrap helpers used when resolving a hub selection into a runtime graph.
 */

import type { AudioSetup } from '../../data-model/audioSetupTypes';
import type { NodeGraph } from '../../data-model/types';
import {
  clearArrangementSnapshotIfPrimaryMismatch,
  setPlaylistCurrentIndex,
  setPlaylistOrder,
  setPrimarySource,
} from '../../data-model';
import {
  getPlaylistOrder,
  getTracksData,
  playlistPrimaryFromBundledCatalog,
} from '../../runtime/tracksData';
import type { ErrorHandler } from '../../utils/errorHandling';

/** Remap node/connection/graph ids so a loaded preset does not collide with live ids. */
export function remapGraphIds(g: NodeGraph): NodeGraph {
  const newGraphId = `graph-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const nodeIdMap = new Map<string, string>();
  const nodes = g.nodes.map((n) => {
    const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    nodeIdMap.set(n.id, newId);
    return { ...n, id: newId };
  });
  const connections = g.connections.map((c) => ({
    ...c,
    id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    sourceNodeId: nodeIdMap.get(c.sourceNodeId) ?? c.sourceNodeId,
    targetNodeId: nodeIdMap.get(c.targetNodeId) ?? c.targetNodeId,
  }));
  const automation =
    g.automation == null
      ? undefined
      : {
          ...g.automation,
          lanes: g.automation.lanes.map((lane) => ({
            ...lane,
            nodeId: nodeIdMap.get(lane.nodeId) ?? lane.nodeId,
          })),
        };
  return {
    ...g,
    id: newGraphId,
    nodes,
    connections,
    ...(automation !== undefined && { automation }),
    viewState: {
      ...(g.viewState ?? { zoom: 1, panX: 0, panY: 0, selectedNodeIds: [] }),
      selectedNodeIds: [],
    },
  };
}

/** Sync bundled playlist order + primary from a starting track id (preset / hub load). */
export async function applyStartingTrack(
  audioSetup: AudioSetup,
  startingTrackId: string,
  errorHandler?: ErrorHandler
): Promise<AudioSetup> {
  try {
    const data = await getTracksData();
    const order = getPlaylistOrder(data);
    let setup = setPlaylistOrder(audioSetup, order);
    setup = setPrimarySource(setup, playlistPrimaryFromBundledCatalog(startingTrackId, data));
    const idx = order.indexOf(startingTrackId);
    setup = setPlaylistCurrentIndex(setup, idx >= 0 ? idx : 0);
    return clearArrangementSnapshotIfPrimaryMismatch(setup);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errorHandler?.report(
      'runtime',
      'warning',
      `Could not sync the bundled track catalog (${msg}). Using the playlist saved in this project.`,
      { originalError: e instanceof Error ? e : undefined }
    );
    return audioSetup;
  }
}
