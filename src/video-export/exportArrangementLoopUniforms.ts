/**
 * Arrangement loop-index uniforms for offline export (pattern onsets + arrangement-notes).
 */

import type { AudioSetup } from '../data-model/audioSetupTypes';
import type { NodeGraph } from '../data-model/types';
import { collectArrangementNotesLoopUniformUpdates } from '../runtime/arrangement/arrangementNotesPreviewLoop';
import { collectArrangementPatternOnsetLoopUniformUpdates } from '../runtime/arrangement/arrangementPatternPreviewLoop';
import type { FrameAudioState } from './OfflineAudioProvider';

export function getArrangementLoopExportUniformUpdates(
  graph: NodeGraph | null | undefined,
  audioSetup: AudioSetup | null | undefined,
  timelineTime: number
): FrameAudioState['uniformUpdates'] {
  if (!graph?.nodes?.length || !Number.isFinite(timelineTime)) {
    return [];
  }

  return [
    ...collectArrangementPatternOnsetLoopUniformUpdates({ graph, timelineTime, audioSetup }),
    ...collectArrangementNotesLoopUniformUpdates({ graph, timelineTime, audioSetup }),
  ];
}
