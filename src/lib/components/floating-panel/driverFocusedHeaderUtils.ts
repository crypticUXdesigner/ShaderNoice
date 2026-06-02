import type { ArrangementTrackFilterRow } from '../../../audiotool/arrangement/arrangementTrackFilter';

/** Format live driver output for focused header (audio remapper / MIDI envelope). */
export function formatDriverLiveValue(value: number): string {
  return value.toFixed(3);
}

const TRACK_CHIP_VISIBLE_MAX = 2;

export type DriverFocusedSourceChip = { id: string; label: string };

/** First N track labels plus overflow count for focused MIDI source row. */
export function summarizeTrackChipsForHeader(
  tracks: readonly ArrangementTrackFilterRow[]
): { chips: DriverFocusedSourceChip[]; overflowCount: number } {
  const toChip = (t: ArrangementTrackFilterRow): DriverFocusedSourceChip => ({
    id: t.id,
    label: t.label,
  });
  if (tracks.length <= TRACK_CHIP_VISIBLE_MAX) {
    return { chips: tracks.map(toChip), overflowCount: 0 };
  }
  return {
    chips: tracks.slice(0, TRACK_CHIP_VISIBLE_MAX).map(toChip),
    overflowCount: tracks.length - TRACK_CHIP_VISIBLE_MAX,
  };
}
