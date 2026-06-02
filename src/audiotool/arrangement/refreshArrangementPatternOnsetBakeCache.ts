import type { NodeGraph } from '../../data-model/types';
import type { ArrangementSnapshot } from './types';
import {
  clearArrangementPatternOnsetBakeCache,
  setArrangementPatternOnsetBakeCache,
} from './arrangementPatternOnsetBakeCache';
import { arrangementTrackFilterCacheKey } from './arrangementTrackFilter';
import { isArrangementPatternOnsetNodeType } from '../../shaders/arrangement/pattern/constants';
import {
  filterNotePatternForNode,
  readArrangementPatternPackOptions,
} from '../../shaders/arrangement/pattern/notePatternBake';

/** Rebuild preview onset index cache on the main thread (worker compile does not share module state). */
export function refreshArrangementPatternOnsetBakeCacheFromGraph(
  graph: NodeGraph | null | undefined,
  snapshot: ArrangementSnapshot | undefined
): void {
  clearArrangementPatternOnsetBakeCache();
  if (!graph?.nodes?.length || !snapshot?.notes?.length) return;

  for (const node of graph.nodes) {
    if (!isArrangementPatternOnsetNodeType(node.type)) continue;
    const packed = filterNotePatternForNode(snapshot, node);
    const trackFilterKey = arrangementTrackFilterCacheKey(readArrangementPatternPackOptions(node));
    setArrangementPatternOnsetBakeCache(node.id, packed.onsets, trackFilterKey);
  }
}
