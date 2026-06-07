/**
 * Rebuild arrangement bake caches used by export-time loop uniform evaluators.
 * Mirrors CompilationManager post-compile refresh (worker compile does not share module state).
 */

import type { AudioSetup } from '../data-model/audioSetupTypes';
import type { NodeGraph } from '../data-model/types';
import { refreshArrangementNotesBakeCacheFromGraph } from '../audiotool/arrangement/refreshArrangementNotesBakeCache';
import { refreshArrangementPatternOnsetBakeCacheFromGraph } from '../audiotool/arrangement/refreshArrangementPatternOnsetBakeCache';

export function refreshExportArrangementBakeCaches(
  graph: NodeGraph,
  audioSetup: AudioSetup | null | undefined
): void {
  const snapshot = audioSetup?.arrangementSnapshot;
  refreshArrangementNotesBakeCacheFromGraph(graph, snapshot);
  refreshArrangementPatternOnsetBakeCacheFromGraph(graph, snapshot);
}
