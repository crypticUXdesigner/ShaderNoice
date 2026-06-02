import type { PackedPatternOnset } from '../../shaders/arrangement/pattern/notePatternBake';

export type ArrangementPatternOnsetBakeCacheEntry = {
  onsets: readonly PackedPatternOnset[];
  /** When set, preview loop can detect stale cache without repacking every frame. */
  trackFilterKey?: string;
};

const bakeByNodeId = new Map<string, ArrangementPatternOnsetBakeCacheEntry>();

export function clearArrangementPatternOnsetBakeCache(): void {
  bakeByNodeId.clear();
}

export function setArrangementPatternOnsetBakeCache(
  nodeId: string,
  onsets: readonly PackedPatternOnset[],
  trackFilterKey?: string
): void {
  bakeByNodeId.set(nodeId, { onsets, trackFilterKey });
}

export function getArrangementPatternOnsetBakeCacheEntry(
  nodeId: string
): ArrangementPatternOnsetBakeCacheEntry | undefined {
  return bakeByNodeId.get(nodeId);
}

export function getArrangementPatternOnsetBakeCache(
  nodeId: string
): readonly PackedPatternOnset[] | undefined {
  return bakeByNodeId.get(nodeId)?.onsets;
}
