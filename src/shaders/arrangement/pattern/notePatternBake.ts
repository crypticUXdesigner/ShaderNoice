import type { NodeInstance } from '../../../data-model/types';
import {
  ARRANGEMENT_NOTES_INTERACTIVE_PACK_LIMIT,
  MAX_ARRANGEMENT_NOTES_PACKED,
  type ArrangementSnapshot,
} from '../../../audiotool/arrangement/types';
import { trackPassesArrangementFilter } from '../../../audiotool/arrangement/arrangementTrackFilter';
import {
  clampNoteLoopRangeForPreviewBudget,
  resolveArrangementNotesPreviewLoopBudget,
} from '../../../audiotool/arrangement/arrangementNotesVisibleRange';
import {
  readArrangementPatternPackOptions,
  resolveVisibleTracks,
  type ArrangementLanesPackOptions,
} from '../packArrangementRegionsForGlsl';
import {
  DEFAULT_PATTERN_BIN_WIDTH_SECONDS,
  MAX_PATTERN_ONSET_LOOP,
  MAX_PATTERN_TIME_BINS,
} from './constants';

export { readArrangementPatternPackOptions } from '../packArrangementRegionsForGlsl';

export type PackedPatternOnset = {
  startSeconds: number;
  endSeconds: number;
  pitch: number;
  velocity: number;
  trackIndex: number;
};

export type NotePatternTimeBin = {
  onsetCount: number;
  maxVelocity: number;
  meanVelocity: number;
  meanPitch: number;
};

export type NotePatternActiveBin = {
  activeCount: number;
  /** Length 12 — velocity-weighted energy per pitch class for notes active during the bin. */
  pitchClassEnergy: readonly number[];
};

export type NotePatternPackResult = {
  durationSeconds: number;
  binWidthSeconds: number;
  binCount: number;
  timeBins: NotePatternTimeBin[];
  activeBins: NotePatternActiveBin[];
  /** Per time bin, 12 pitch-class energy samples (same values as `activeBins[i].pitchClassEnergy`). */
  pitchClassEnergyBins: readonly (readonly number[])[];
  onsets: PackedPatternOnset[];
};

type ScratchNote = {
  startSeconds: number;
  endSeconds: number;
  pitch: number;
  velocity: number;
  trackId: string;
};

let subsampleDiagnosticLogged = false;
let binLayoutClampDiagnosticLogged = false;

export function resolvePatternBinLayout(durationSeconds: number): {
  binWidthSeconds: number;
  binCount: number;
} {
  const safeDuration =
    typeof durationSeconds === 'number' && Number.isFinite(durationSeconds)
      ? durationSeconds
      : DEFAULT_PATTERN_BIN_WIDTH_SECONDS;
  const duration = Math.max(safeDuration, DEFAULT_PATTERN_BIN_WIDTH_SECONDS);
  let binCount = Math.ceil(duration / DEFAULT_PATTERN_BIN_WIDTH_SECONDS);
  let binWidthSeconds = DEFAULT_PATTERN_BIN_WIDTH_SECONDS;
  if (binCount > MAX_PATTERN_TIME_BINS) {
    const unclamped = binCount;
    binCount = MAX_PATTERN_TIME_BINS;
    binWidthSeconds = duration / binCount;
    if (!binLayoutClampDiagnosticLogged && import.meta.env?.DEV) {
      binLayoutClampDiagnosticLogged = true;
      console.info('[arrangement] pattern time-bin bake clamped for GLSL limits', {
        durationSeconds: duration,
        unclampedBins: unclamped,
        binCount,
        binWidthSeconds,
        maxPatternTimeBins: MAX_PATTERN_TIME_BINS,
      });
    }
  }
  const safeBinCount =
    Number.isFinite(binCount) && binCount > 0 ? Math.floor(binCount) : 1;
  const safeBinWidth =
    Number.isFinite(binWidthSeconds) && binWidthSeconds > 0
      ? binWidthSeconds
      : DEFAULT_PATTERN_BIN_WIDTH_SECONDS;
  return { binWidthSeconds: safeBinWidth, binCount: Math.max(1, safeBinCount) };
}

function emptyPitchClassEnergy(): number[] {
  return Array.from({ length: 12 }, () => 0);
}

function emptyNotePatternPack(): NotePatternPackResult {
  return {
    durationSeconds: 0,
    binWidthSeconds: DEFAULT_PATTERN_BIN_WIDTH_SECONDS,
    binCount: 0,
    timeBins: [],
    activeBins: [],
    pitchClassEnergyBins: [],
    onsets: [],
  };
}

function scratchNotesFromSnapshot(
  snapshot: ArrangementSnapshot,
  options: ArrangementLanesPackOptions,
  visibleNoteTrackIndexById: Map<string, number>
): ScratchNote[] {
  const scratch: ScratchNote[] = [];
  const notes = snapshot.notes ?? [];
  for (const note of notes) {
    if (
      !trackPassesArrangementFilter(note.trackId, snapshot, options.trackFilterMode, options.trackFilterList)
    ) {
      continue;
    }
    if (!visibleNoteTrackIndexById.has(note.trackId)) continue;
    scratch.push({
      startSeconds: note.startSeconds,
      endSeconds: note.startSeconds + note.durationSeconds,
      pitch: note.pitch,
      velocity: note.velocity,
      trackId: note.trackId,
    });
    if (scratch.length >= MAX_ARRANGEMENT_NOTES_PACKED) break;
  }
  scratch.sort(
    (a, b) =>
      a.startSeconds - b.startSeconds || a.pitch - b.pitch || a.trackId.localeCompare(b.trackId)
  );
  return scratch;
}

function buildTimeBins(scratch: ScratchNote[], binWidthSeconds: number, binCount: number): NotePatternTimeBin[] {
  const bins: NotePatternTimeBin[] = Array.from({ length: binCount }, () => ({
    onsetCount: 0,
    maxVelocity: 0,
    meanVelocity: 0,
    meanPitch: 0,
  }));

  for (const row of scratch) {
    if (!Number.isFinite(row.startSeconds)) continue;
    const binIndex = Math.min(
      binCount - 1,
      Math.max(0, Math.floor(row.startSeconds / binWidthSeconds))
    );
    const bin = bins[binIndex];
    if (bin == null) continue;
    if (bin.onsetCount === 0) {
      bin.maxVelocity = row.velocity;
      bin.meanVelocity = row.velocity;
      bin.meanPitch = row.pitch;
    } else {
      const n = bin.onsetCount;
      bin.maxVelocity = Math.max(bin.maxVelocity, row.velocity);
      bin.meanVelocity = (bin.meanVelocity * n + row.velocity) / (n + 1);
      bin.meanPitch = (bin.meanPitch * n + row.pitch) / (n + 1);
    }
    bin.onsetCount += 1;
  }

  return bins;
}

function buildActiveBins(
  scratch: ScratchNote[],
  binWidthSeconds: number,
  binCount: number
): NotePatternActiveBin[] {
  const bins: NotePatternActiveBin[] = Array.from({ length: binCount }, () => ({
    activeCount: 0,
    pitchClassEnergy: emptyPitchClassEnergy(),
  }));

  for (let i = 0; i < binCount; i++) {
    const binStart = i * binWidthSeconds;
    const binEnd = binStart + binWidthSeconds;
    const energy = emptyPitchClassEnergy();
    let activeCount = 0;

    for (const row of scratch) {
      if (row.endSeconds <= binStart || row.startSeconds >= binEnd) continue;
      activeCount += 1;
      const pc = ((Math.round(row.pitch) % 12) + 12) % 12;
      energy[pc] = (energy[pc] ?? 0) + row.velocity;
    }

    bins[i] = { activeCount, pitchClassEnergy: energy };
  }

  return bins;
}

function buildOnsets(
  scratch: ScratchNote[],
  visibleNoteTrackIndexById: Map<string, number>
): PackedPatternOnset[] {
  return scratch.map((row) => ({
    startSeconds: row.startSeconds,
    endSeconds: row.endSeconds,
    pitch: row.pitch,
    velocity: row.velocity,
    trackIndex: visibleNoteTrackIndexById.get(row.trackId) ?? 0,
  }));
}

function subsampleOnsetsIfNeeded(onsets: PackedPatternOnset[]): PackedPatternOnset[] {
  const limit = ARRANGEMENT_NOTES_INTERACTIVE_PACK_LIMIT;
  const n = onsets.length;
  if (n <= limit) return onsets;

  if (!subsampleDiagnosticLogged && import.meta.env?.DEV) {
    subsampleDiagnosticLogged = true;
    console.info(
      '[arrangement] pattern onset bake subsampled',
      { bakedOnsets: n, limit, policy: 'even stride (matches arrangement-notes interactive cap)' }
    );
  }

  const step = n / limit;
  const pick = (i: number) => Math.min(n - 1, Math.floor(i * step));
  return Array.from({ length: limit }, (_, i) => onsets[pick(i)]!);
}

/** Full note-side pattern bake: time bins, active bins, pitch-class tables, sorted onsets. */
export function packArrangementNotePatternData(
  snapshot: ArrangementSnapshot | undefined,
  options: ArrangementLanesPackOptions
): NotePatternPackResult {
  if (!snapshot?.notes?.length) {
    return emptyNotePatternPack();
  }

  const visibleNoteTracks = resolveVisibleTracks(snapshot, options).filter((t) => t.kind === 'note');
  const visibleNoteTrackIndexById = new Map(visibleNoteTracks.map((t, i) => [t.id, i]));
  if (visibleNoteTracks.length === 0) {
    return emptyNotePatternPack();
  }

  const scratch = scratchNotesFromSnapshot(snapshot, options, visibleNoteTrackIndexById);
  if (scratch.length === 0) {
    return emptyNotePatternPack();
  }

  const noteExtentSeconds = scratch.reduce((max, row) => Math.max(max, row.endSeconds), 0);
  const layoutDuration =
    typeof snapshot.durationSeconds === 'number' &&
    Number.isFinite(snapshot.durationSeconds) &&
    snapshot.durationSeconds > 0
      ? snapshot.durationSeconds
      : Math.max(noteExtentSeconds, DEFAULT_PATTERN_BIN_WIDTH_SECONDS);
  const { binWidthSeconds, binCount } = resolvePatternBinLayout(layoutDuration);
  const timeBins = buildTimeBins(scratch, binWidthSeconds, binCount);
  const activeBins = buildActiveBins(scratch, binWidthSeconds, binCount);
  const pitchClassEnergyBins = activeBins.map((b) => b.pitchClassEnergy);
  const onsets = subsampleOnsetsIfNeeded(buildOnsets(scratch, visibleNoteTrackIndexById));

  return {
    durationSeconds: snapshot.durationSeconds,
    binWidthSeconds,
    binCount,
    timeBins,
    activeBins,
    pitchClassEnergyBins,
    onsets,
  };
}

export function packArrangementNoteTimeBinsForGlsl(
  snapshot: ArrangementSnapshot | undefined,
  options: ArrangementLanesPackOptions
): Pick<NotePatternPackResult, 'durationSeconds' | 'binWidthSeconds' | 'binCount' | 'timeBins'> {
  const pack = packArrangementNotePatternData(snapshot, options);
  return {
    durationSeconds: pack.durationSeconds,
    binWidthSeconds: pack.binWidthSeconds,
    binCount: pack.binCount,
    timeBins: pack.timeBins,
  };
}

export function packArrangementActiveNoteBinsForGlsl(
  snapshot: ArrangementSnapshot | undefined,
  options: ArrangementLanesPackOptions
): Pick<NotePatternPackResult, 'durationSeconds' | 'binWidthSeconds' | 'binCount' | 'activeBins'> {
  const pack = packArrangementNotePatternData(snapshot, options);
  return {
    durationSeconds: pack.durationSeconds,
    binWidthSeconds: pack.binWidthSeconds,
    binCount: pack.binCount,
    activeBins: pack.activeBins,
  };
}

export function packArrangementPitchClassEnergyForGlsl(
  snapshot: ArrangementSnapshot | undefined,
  options: ArrangementLanesPackOptions
): Pick<
  NotePatternPackResult,
  'durationSeconds' | 'binWidthSeconds' | 'binCount' | 'pitchClassEnergyBins'
> {
  const pack = packArrangementNotePatternData(snapshot, options);
  return {
    durationSeconds: pack.durationSeconds,
    binWidthSeconds: pack.binWidthSeconds,
    binCount: pack.binCount,
    pitchClassEnergyBins: pack.pitchClassEnergyBins,
  };
}

export function packArrangementNoteOnsetsForGlsl(
  snapshot: ArrangementSnapshot | undefined,
  options: ArrangementLanesPackOptions
): Pick<NotePatternPackResult, 'onsets'> {
  return { onsets: packArrangementNotePatternData(snapshot, options).onsets };
}

export function filterNotePatternForNode(
  snapshot: ArrangementSnapshot | undefined,
  node: NodeInstance
): NotePatternPackResult {
  return packArrangementNotePatternData(snapshot, readArrangementPatternPackOptions(node));
}

/** Trailing onset window `[timelineTime - windowSeconds, timelineTime]` used by pattern nodes. */
export function arrangementPatternOnsetVisibleTimeWindow(
  timelineTime: number,
  windowSeconds: number
): { windowStart: number; windowEnd: number } {
  const winSec = Math.max(windowSeconds, 1e-4);
  return { windowStart: timelineTime - winSec, windowEnd: timelineTime };
}

/**
 * Onsets sorted by `startSeconds`. Returns half-open `[start, end)` indices with onsets starting in the window.
 */
export function findOnsetIndexRangeForWindow(
  onsets: readonly PackedPatternOnset[],
  windowStart: number,
  windowEnd: number
): { start: number; end: number } {
  const n = onsets.length;
  if (n === 0 || windowEnd <= windowStart) {
    return { start: 0, end: 0 };
  }

  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (onsets[mid]!.startSeconds < windowStart) lo = mid + 1;
    else hi = mid;
  }
  const start = lo;

  lo = start;
  hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (onsets[mid]!.startSeconds < windowEnd) lo = mid + 1;
    else hi = mid;
  }

  return { start, end: lo };
}

export function resolvePatternOnsetPreviewLoopBudget(bakedOnsetCount: number): number {
  return Math.min(MAX_PATTERN_ONSET_LOOP, resolveArrangementNotesPreviewLoopBudget(bakedOnsetCount));
}

/** Clamp an onset index span to the interactive preview budget, centered on `timelineTime`. */
export function clampOnsetLoopRangeForPreviewBudget(
  onsets: readonly PackedPatternOnset[],
  range: { start: number; end: number },
  timelineTime: number,
  maxOnsets: number = MAX_PATTERN_ONSET_LOOP
): { start: number; end: number } {
  const asNotes = onsets.map((o) => ({
    startSeconds: o.startSeconds,
    endSeconds: o.endSeconds,
    pitch: o.pitch,
    velocity: o.velocity,
  }));
  return clampNoteLoopRangeForPreviewBudget(asNotes, range, timelineTime, maxOnsets);
}

/** Reset subsample diagnostic (tests). */
export function resetNotePatternBakeDiagnosticsForTests(): void {
  subsampleDiagnosticLogged = false;
}

/**
 * Sample pitch-class energy at `time` with a linear release tail over `[time - release, time]`.
 * Mirrors the GLSL `arrPatternPcEnergyAt_*` helper used by pitch-class pattern nodes.
 */
export type NoteDensityWindowSample = {
  density: number;
  meanPitch: number;
  meanVelocity: number;
};

/**
 * Aggregate release-weighted onset density and mean pitch/velocity over `[time - windowSeconds, time]`.
 * Mirrors the GLSL `rhythmStripeFieldSampleWindow_*` helper.
 */
export function sampleNoteDensityWindow(
  pack: Pick<NotePatternPackResult, 'binWidthSeconds' | 'binCount' | 'timeBins'>,
  time: number,
  windowSeconds: number,
  releaseSeconds = 0.35
): NoteDensityWindowSample {
  if (pack.binCount === 0) {
    return { density: 0, meanPitch: 60, meanVelocity: 0 };
  }

  const win = Math.max(windowSeconds, 1e-4);
  const rel = Math.max(releaseSeconds, 1e-4);
  const t0 = Math.max(0, time - win);
  const i0 = Math.min(
    pack.binCount - 1,
    Math.max(0, Math.floor(t0 / pack.binWidthSeconds))
  );
  const i1 = Math.min(
    pack.binCount - 1,
    Math.max(0, Math.floor(time / pack.binWidthSeconds))
  );

  let weightedOnsets = 0;
  let velSum = 0;
  let pitchSum = 0;

  for (let i = i0; i <= i1 && i - i0 < 64; i++) {
    const binCenter = (i + 0.5) * pack.binWidthSeconds;
    const age = time - binCenter;
    if (age < 0 || age > win) continue;
    const decay = Math.max(0, 1 - age / rel);
    const bin = pack.timeBins[i]!;
    const w = bin.onsetCount * decay;
    weightedOnsets += w;
    if (bin.onsetCount > 0) {
      velSum += bin.meanVelocity * w;
      pitchSum += bin.meanPitch * w;
    }
  }

  const density = Math.min(1, weightedOnsets / 4);
  const meanVelocity = weightedOnsets > 0 ? velSum / weightedOnsets : 0;
  const meanPitch = weightedOnsets > 0 ? pitchSum / weightedOnsets : 60;
  return { density, meanPitch, meanVelocity };
}

/** Count pitch classes with energy above `minEnergy` at `time` (mirrors chord-voronoi site loop). */
export function countActivePitchClassesAt(
  pack: Pick<NotePatternPackResult, 'binWidthSeconds' | 'binCount' | 'pitchClassEnergyBins'>,
  time: number,
  release: number,
  minEnergy = 0.02
): number {
  let count = 0;
  for (let pc = 0; pc < 12; pc++) {
    if (samplePitchClassEnergyAt(pack, time, release, pc) >= minEnergy) {
      count++;
    }
  }
  return count;
}

/** Map MIDI pitch to a compass sector index for `sectorCount` wedges (2–24). */
export function midiPitchToPatternSector(pitch: number, sectorCount: number): number {
  const sc = Math.max(2, Math.min(24, Math.floor(sectorCount)));
  const pc = ((Math.round(pitch) % 12) + 12) % 12;
  return Math.floor((pc * sc) / 12) % sc;
}

/** CPU mirror of onset-driven `pitch-class-compass` sector energy. */
export function samplePitchClassCompassSectorEnergyAt(
  pack: Pick<NotePatternPackResult, 'onsets'>,
  time: number,
  windowSeconds: number,
  decay: number,
  sector: number,
  sectorCount: number
): number {
  const sc = Math.max(2, Math.min(24, Math.floor(sectorCount)));
  const sectorMod = ((Math.floor(sector) % sc) + sc) % sc;
  const windowStart = time - windowSeconds;
  const rel = Math.max(decay, 1e-4);
  let energy = 0;
  for (const onset of pack.onsets) {
    if (onset.startSeconds > time || onset.startSeconds < windowStart) continue;
    const age = time - onset.startSeconds;
    if (age < 0 || age > rel) continue;
    if (midiPitchToPatternSector(onset.pitch, sc) !== sectorMod) continue;
    const pulse = (1 - age / rel) * onset.velocity;
    energy = Math.max(energy, pulse);
  }
  return energy;
}

export function samplePitchClassEnergyAt(
  pack: Pick<NotePatternPackResult, 'binWidthSeconds' | 'binCount' | 'pitchClassEnergyBins'>,
  time: number,
  release: number,
  pitchClass: number
): number {
  if (pack.binCount === 0) return 0;

  const rel = Math.max(release, 1e-4);
  const t0 = Math.max(0, time - rel);
  const i0 = Math.min(
    pack.binCount - 1,
    Math.max(0, Math.floor(t0 / pack.binWidthSeconds))
  );
  const i1 = Math.min(
    pack.binCount - 1,
    Math.max(0, Math.floor(time / pack.binWidthSeconds))
  );
  const pc = ((Math.round(pitchClass) % 12) + 12) % 12;

  let energy = 0;
  for (let i = i0; i <= i1 && i - i0 < 64; i++) {
    const binCenter = (i + 0.5) * pack.binWidthSeconds;
    const age = time - binCenter;
    if (age < 0 || age > rel) continue;
    const decay = 1 - age / rel;
    const e = pack.pitchClassEnergyBins[i]?.[pc] ?? 0;
    energy = Math.max(energy, e * decay);
  }
  return energy;
}

/** Mirrors GLSL `durationCometDurationScale` — longer notes → longer comet strokes. */
export function durationCometDurationScale(durationSeconds: number, durationGain: number): number {
  return Math.min(1, Math.max(0, durationSeconds * durationGain * 6));
}

/** Mirrors GLSL `durationCometTrailLen` for tests and tooling. */
export function durationCometTrailLength(
  baseLength: number,
  durationSeconds: number,
  durationGain: number
): number {
  return baseLength * (0.2 + durationCometDurationScale(durationSeconds, durationGain));
}
