import type { ArrangementSnapshot } from './types';
import type { NotePatternPackResult } from '../../shaders/arrangement/pattern/notePatternBake';

const LOG_PREFIX = '[arrangement]';

export function logNotePatternBakeDiagnostics(
  nodeId: string,
  snapshot: ArrangementSnapshot | undefined,
  packed: NotePatternPackResult,
  trackFilterMode: number,
  trackFilterList: string
): void {
  const snapshotNotes = snapshot?.notes?.length ?? 0;
  const bakedOnsets = packed.onsets.length;

  console.info(`${LOG_PREFIX} compile bake (pattern notes)`, {
    nodeId,
    snapshotNotes,
    bakedOnsets,
    binCount: packed.binCount,
    binWidthSeconds: packed.binWidthSeconds,
    trackFilterMode,
    trackFilterList: trackFilterList || '(empty)',
  });

  if (snapshotNotes > 0 && bakedOnsets === 0) {
    console.warn(
      `${LOG_PREFIX} compile: snapshot has ${snapshotNotes} notes but pattern bake has 0 onsets — check Tracks filter (mode ${trackFilterMode}) or re-import.`
    );
  }
}
