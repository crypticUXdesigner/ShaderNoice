import type { NodeInstance } from '../../../data-model/types';

import {

  type ArrangementRegionKind,

  type ArrangementSnapshot,

  type ArrangementTrack,

} from '../../../audiotool/arrangement/types';

import { trackPassesArrangementFilter } from '../../../audiotool/arrangement/arrangementTrackFilter';

import {

  readArrangementPatternPackOptions,

  resolveVisibleTracks,

  type ArrangementLanesPackOptions,

} from '../packArrangementRegionsForGlsl';

import {

  DEFAULT_PATTERN_BIN_WIDTH_SECONDS,

  MAX_PATTERN_BOUNDARY_EVENTS,

  MAX_PATTERN_TRACK_LOOP,

} from './constants';

import { resolvePatternBinLayout } from './notePatternBake';



export type PackedPatternBoundary = {

  time: number;

  trackRow: number;

  /** 0 = note, 1 = audio, 2 = pattern */

  kind: number;

  /** 0 = region start, 1 = region end */

  isEnd: number;

};



export type TrackEnergyBin = {

  energy: number;

  meanPitch: number;

  maxVelocity: number;

};



export type RegionPatternPackResult = {

  durationSeconds: number;

  binWidthSeconds: number;

  binCount: number;

  boundaries: PackedPatternBoundary[];

  trackCount: number;

  trackEnergyBins: TrackEnergyBin[];

};



type ScratchNote = {

  startSeconds: number;

  endSeconds: number;

  pitch: number;

  velocity: number;

  trackId: string;

};



function regionKindToInt(kind: ArrangementRegionKind): number {

  if (kind === 'audio') return 1;

  if (kind === 'pattern') return 2;

  return 0;

}



function trackRowNormalized(track: ArrangementTrack, visibleTracks: ArrangementTrack[]): number {

  if (visibleTracks.length <= 1) return 0.0;

  const index = visibleTracks.findIndex((t) => t.id === track.id);

  if (index < 0) return 0.0;

  return index / Math.max(1, visibleTracks.length - 1);

}



function emptyRegionPatternPack(): RegionPatternPackResult {

  return {

    durationSeconds: 0,

    binWidthSeconds: DEFAULT_PATTERN_BIN_WIDTH_SECONDS,

    binCount: 0,

    boundaries: [],

    trackCount: 0,

    trackEnergyBins: [],

  };

}



function buildBoundaries(

  snapshot: ArrangementSnapshot,

  visibleTracks: ArrangementTrack[]

): PackedPatternBoundary[] {

  const trackById = new Map(visibleTracks.map((t) => [t.id, t]));

  const events: PackedPatternBoundary[] = [];



  for (const region of snapshot.regions) {

    if (!region.enabled) continue;

    const track = trackById.get(region.trackId);

    if (!track) continue;

    const trackRow = trackRowNormalized(track, visibleTracks);

    const kind = regionKindToInt(region.kind);

    const start = region.startSeconds;

    const end = region.startSeconds + region.durationSeconds;

    events.push({ time: start, trackRow, kind, isEnd: 0 });

    events.push({ time: end, trackRow, kind, isEnd: 1 });

  }



  events.sort((a, b) => a.time - b.time || a.isEnd - b.isEnd || a.trackRow - b.trackRow);

  return events.slice(0, MAX_PATTERN_BOUNDARY_EVENTS);

}



function scratchNotesFromSnapshot(

  snapshot: ArrangementSnapshot,

  options: ArrangementLanesPackOptions,

  visibleTrackIds: Set<string>

): ScratchNote[] {

  const scratch: ScratchNote[] = [];

  for (const note of snapshot.notes ?? []) {

    if (

      !trackPassesArrangementFilter(note.trackId, snapshot, options.trackFilterMode, options.trackFilterList)

    ) {

      continue;

    }

    if (!visibleTrackIds.has(note.trackId)) continue;

    scratch.push({

      startSeconds: note.startSeconds,

      endSeconds: note.startSeconds + note.durationSeconds,

      pitch: note.pitch,

      velocity: note.velocity,

      trackId: note.trackId,

    });

  }

  return scratch;

}



function buildTrackEnergyBins(

  scratch: ScratchNote[],

  visibleTracks: ArrangementTrack[],

  binWidthSeconds: number,

  binCount: number

): TrackEnergyBin[] {

  const trackCount = visibleTracks.length;

  const trackIndexById = new Map(visibleTracks.map((t, i) => [t.id, i]));

  const bins: Array<TrackEnergyBin & { count: number }> = Array.from(

    { length: trackCount * binCount },

    () => ({ energy: 0, meanPitch: 0, maxVelocity: 0, count: 0 })

  );



  for (let i = 0; i < binCount; i++) {

    const binStart = i * binWidthSeconds;

    const binEnd = binStart + binWidthSeconds;

    for (const row of scratch) {

      if (row.endSeconds <= binStart || row.startSeconds >= binEnd) continue;

      const trackIndex = trackIndexById.get(row.trackId);

      if (trackIndex === undefined) continue;

      const idx = trackIndex * binCount + i;

      const bin = bins[idx]!;

      bin.energy += row.velocity;

      bin.maxVelocity = Math.max(bin.maxVelocity, row.velocity);

      if (bin.count === 0) {

        bin.meanPitch = row.pitch;

      } else {

        bin.meanPitch = (bin.meanPitch * bin.count + row.pitch) / (bin.count + 1);

      }

      bin.count += 1;

    }

  }



  return bins.map(({ energy, meanPitch, maxVelocity }) => ({ energy, meanPitch, maxVelocity }));

}



/** Full region-side pattern bake: boundary events + per-track energy bins. */

export function packArrangementRegionPatternData(

  snapshot: ArrangementSnapshot | undefined,

  options: ArrangementLanesPackOptions

): RegionPatternPackResult {

  if (!snapshot) {

    return emptyRegionPatternPack();

  }



  const visibleTracks = resolveVisibleTracks(snapshot, options).slice(0, MAX_PATTERN_TRACK_LOOP);

  if (visibleTracks.length === 0) {

    return emptyRegionPatternPack();

  }



  const boundaries = buildBoundaries(snapshot, visibleTracks);

  const { binWidthSeconds, binCount } = resolvePatternBinLayout(snapshot.durationSeconds);

  const visibleTrackIds = new Set(visibleTracks.map((t) => t.id));

  const scratch = scratchNotesFromSnapshot(snapshot, options, visibleTrackIds);

  const trackEnergyBins = buildTrackEnergyBins(scratch, visibleTracks, binWidthSeconds, binCount);



  return {

    durationSeconds: snapshot.durationSeconds,

    binWidthSeconds,

    binCount,

    boundaries,

    trackCount: visibleTracks.length,

    trackEnergyBins,

  };

}



export function packArrangementRegionBoundariesForGlsl(

  snapshot: ArrangementSnapshot | undefined,

  options: ArrangementLanesPackOptions

): Pick<RegionPatternPackResult, 'boundaries'> {

  return { boundaries: packArrangementRegionPatternData(snapshot, options).boundaries };

}



export function packArrangementTrackEnergyBinsForGlsl(

  snapshot: ArrangementSnapshot | undefined,

  options: ArrangementLanesPackOptions

): Pick<

  RegionPatternPackResult,

  'durationSeconds' | 'binWidthSeconds' | 'binCount' | 'trackCount' | 'trackEnergyBins'

> {

  const pack = packArrangementRegionPatternData(snapshot, options);

  return {

    durationSeconds: pack.durationSeconds,

    binWidthSeconds: pack.binWidthSeconds,

    binCount: pack.binCount,

    trackCount: pack.trackCount,

    trackEnergyBins: pack.trackEnergyBins,

  };

}



export function filterRegionPatternForNode(

  snapshot: ArrangementSnapshot | undefined,

  node: NodeInstance

): RegionPatternPackResult {

  return packArrangementRegionPatternData(snapshot, readArrangementPatternPackOptions(node));

}



/** `-1` = all kinds; `0/1/2` = note / audio / pattern region kinds. */

export function readRegionKindFilterOptions(node: NodeInstance): number {

  const raw = Number(node.parameters.kindFilter ?? -1);

  if (!Number.isFinite(raw)) return -1;

  return Math.round(raw);

}



/**

 * Boundaries sorted by `time`. Returns half-open `[start, end)` indices with events in the window.

 */

export function findBoundaryIndexRangeForWindow(

  boundaries: readonly PackedPatternBoundary[],

  windowStart: number,

  windowEnd: number

): { start: number; end: number } {

  const n = boundaries.length;

  if (n === 0 || windowEnd <= windowStart) {

    return { start: 0, end: 0 };

  }



  let lo = 0;

  let hi = n;

  while (lo < hi) {

    const mid = (lo + hi) >> 1;

    if (boundaries[mid]!.time < windowStart) lo = mid + 1;

    else hi = mid;

  }

  const start = lo;



  lo = start;

  hi = n;

  while (lo < hi) {

    const mid = (lo + hi) >> 1;

    if (boundaries[mid]!.time < windowEnd) lo = mid + 1;

    else hi = mid;

  }



  return { start, end: lo };

}

export function sampleTrackEnergyAt(
  pack: Pick<
    RegionPatternPackResult,
    'binWidthSeconds' | 'binCount' | 'trackCount' | 'trackEnergyBins'
  >,
  trackIndex: number,
  time: number,
  decay: number
): { energy: number; meanPitch: number } {
  if (pack.binCount === 0 || pack.trackCount === 0 || trackIndex < 0 || trackIndex >= pack.trackCount) {
    return { energy: 0, meanPitch: 60 };
  }

  const rel = Math.max(decay, 1e-4);
  const t0 = Math.max(0, time - rel);
  const i0 = Math.min(
    pack.binCount - 1,
    Math.max(0, Math.floor(t0 / pack.binWidthSeconds))
  );
  const i1 = Math.min(
    pack.binCount - 1,
    Math.max(0, Math.floor(time / pack.binWidthSeconds))
  );

  let energy = 0;
  let meanPitch = 60;
  for (let i = i0; i <= i1 && i - i0 < 64; i++) {
    const binCenter = (i + 0.5) * pack.binWidthSeconds;
    const age = time - binCenter;
    if (age < 0 || age > rel) continue;
    const decayFactor = 1 - age / rel;
    const idx = trackIndex * pack.binCount + i;
    const bin = pack.trackEnergyBins[idx];
    if (!bin) continue;
    const e = bin.energy * decayFactor;
    if (e > energy) {
      energy = e;
      meanPitch = bin.meanPitch;
    }
  }
  return { energy, meanPitch };
}


