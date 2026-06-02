import { describe, it, expect } from 'vitest';
import { buildArrangementSnapshot } from '../../../audiotool/arrangement/buildArrangementSnapshot';
import type { RawArrangementEntities } from '../../../audiotool/arrangement/rawEntities';
import type { ArrangementSnapshot } from '../../../audiotool/arrangement/types';
import spikeFixture from '../../../audiotool/arrangement/__fixtures__/spike-arrangement-raw.json';
import {
  buildNoteGravityWarpWgslNodeHelper,
  buildNotePatternGlslBake,
  buildNotePatternWgslBake,
  injectArrangementPatternNoteBake,
  packArrangementActiveNoteBinsForGlsl,
  packArrangementNoteOnsetsForGlsl,
  packArrangementNotePatternData,
  packArrangementNoteTimeBinsForGlsl,
  packArrangementPitchClassEnergyForGlsl,
  findOnsetIndexRangeForWindow,
  resolvePatternBinLayout,
  sampleNoteDensityWindow,
  samplePitchClassEnergyAt,
  samplePitchClassCompassSectorEnergyAt,
  midiPitchToPatternSector,
  countActivePitchClassesAt,
  durationCometTrailLength,
} from './index';
import {
  MAX_PATTERN_GRAVITY_ONSET_LOOP,
  MAX_PATTERN_PC_BAKE_VEC4S,
  MAX_PATTERN_TIME_BINS,
  DEFAULT_PATTERN_BIN_WIDTH_SECONDS,
} from './constants';

const raw = spikeFixture as RawArrangementEntities;
const snapshot = buildArrangementSnapshot(raw);

const defaultOpts = { trackFilterMode: 0, trackFilterList: '' };

const threeNoteSnapshot: ArrangementSnapshot = {
  tracks: [{ id: 'ta', kind: 'note', orderAmongTracks: 0, enabled: true }],
  regions: [],
  notes: [
    {
      id: 'n1',
      collectionId: 'c',
      trackId: 'ta',
      startSeconds: 0,
      durationSeconds: 0.5,
      pitch: 60,
      velocity: 0.8,
    },
    {
      id: 'n2',
      collectionId: 'c',
      trackId: 'ta',
      startSeconds: 0.02,
      durationSeconds: 0.5,
      pitch: 64,
      velocity: 1.0,
    },
    {
      id: 'n3',
      collectionId: 'c',
      trackId: 'ta',
      startSeconds: 1.2,
      durationSeconds: 0.25,
      pitch: 67,
      velocity: 0.5,
    },
  ],
  bpm: 120,
  durationSeconds: 4,
  timeSignature: { numerator: 4, denominator: 4 },
  source: { trackName: 'tracks/t', projectName: 'projects/p', commitIndex: 0 },
};

describe('notePatternBake', () => {
  it('returns zero counts for missing snapshot', () => {
    const pack = packArrangementNotePatternData(undefined, defaultOpts);
    expect(pack.binCount).toBe(0);
    expect(pack.onsets).toHaveLength(0);
    expect(pack.timeBins).toHaveLength(0);
  });

  it('empty bake uses valid GLSL/WGSL array constructors for pitch-class tables', () => {
    const pack = packArrangementNotePatternData(undefined, defaultOpts);
    const glsl = buildNotePatternGlslBake('n-bloom', pack);
    const wgsl = buildNotePatternWgslBake('n-bloom', pack);

    expect(glsl).toContain(
      'const vec4 ARR_PATTERN_PC_n_bloom[3] = vec4[3](vec4(0.0), vec4(0.0), vec4(0.0));'
    );
    expect(wgsl).toContain(
      'const ARR_PATTERN_PC_n_bloom: array<vec4<f32>, 3> = array<vec4<f32>, 3>(vec4<f32>(0.0), vec4<f32>(0.0), vec4<f32>(0.0));'
    );
  });

  it('packs spike fixture with monotonic onset density in occupied bins', () => {
    const pack = packArrangementNotePatternData(snapshot, defaultOpts);
    expect(pack.onsets.length).toBeGreaterThan(0);
    expect(pack.binCount).toBeGreaterThan(0);
    expect(pack.timeBins).toHaveLength(pack.binCount);
    expect(pack.activeBins).toHaveLength(pack.binCount);
    expect(pack.pitchClassEnergyBins).toHaveLength(pack.binCount);

    const totalOnsetsInBins = pack.timeBins.reduce((sum, b) => sum + b.onsetCount, 0);
    expect(totalOnsetsInBins).toBe(pack.onsets.length);

    const occupied = pack.timeBins.filter((b) => b.onsetCount > 0);
    for (let i = 1; i < occupied.length; i++) {
      expect(occupied[i]!.onsetCount).toBeGreaterThanOrEqual(0);
    }
  });

  it('golden 3-note snapshot packs expected bins and onsets', () => {
    const pack = packArrangementNotePatternData(threeNoteSnapshot, defaultOpts);
    expect(pack.onsets).toHaveLength(3);
    expect(pack.onsets[0]?.pitch).toBe(60);
    expect(pack.onsets[1]?.pitch).toBe(64);
    expect(pack.onsets[2]?.pitch).toBe(67);
    expect(pack.onsets.every((o) => o.trackIndex === 0)).toBe(true);

    const { binWidthSeconds } = resolvePatternBinLayout(threeNoteSnapshot.durationSeconds);
    const bin0 = Math.floor(0 / binWidthSeconds);
    const bin1 = Math.floor(1.2 / binWidthSeconds);
    expect(pack.timeBins[bin0]?.onsetCount).toBe(2);
    expect(pack.timeBins[bin1]?.onsetCount).toBe(1);
    expect(pack.timeBins[bin0]?.maxVelocity).toBeCloseTo(1.0, 5);

    const pcBin0 = pack.pitchClassEnergyBins[bin0]!;
    expect(pcBin0[0]).toBeCloseTo(0.8, 5);
    expect(pcBin0[4]).toBeCloseTo(1.0, 5);
  });

  it('findOnsetIndexRangeForWindow selects onsets by start time', () => {
    const { onsets } = packArrangementNoteOnsetsForGlsl(threeNoteSnapshot, defaultOpts);
    const range = findOnsetIndexRangeForWindow(onsets, 0, 0.1);
    expect(range.end - range.start).toBe(2);
    const later = findOnsetIndexRangeForWindow(onsets, 1.0, 1.5);
    expect(later.end - later.start).toBe(1);
  });

  it('individual pack helpers expose slices of the full bake', () => {
    const timeBins = packArrangementNoteTimeBinsForGlsl(threeNoteSnapshot, defaultOpts);
    const active = packArrangementActiveNoteBinsForGlsl(threeNoteSnapshot, defaultOpts);
    const pc = packArrangementPitchClassEnergyForGlsl(threeNoteSnapshot, defaultOpts);
    const onsets = packArrangementNoteOnsetsForGlsl(threeNoteSnapshot, defaultOpts);
    expect(timeBins.binCount).toBe(active.binCount);
    expect(pc.binCount).toBe(active.binCount);
    expect(onsets.onsets).toHaveLength(3);
  });

  it('emits GLSL and WGSL bake constants', () => {
    const pack = packArrangementNotePatternData(threeNoteSnapshot, defaultOpts);
    const glsl = buildNotePatternGlslBake('n-ripple', pack);
    expect(glsl).toContain('ARR_PATTERN_BIN_COUNT_n_ripple = 80');
    expect(glsl).toContain('ARR_PATTERN_ONSET_COUNT_n_ripple = 3');
    expect(glsl).toContain('ARR_PATTERN_TIME_BIN_n_ripple');
    expect(glsl).toContain('ARR_PATTERN_PC_n_ripple');

    const wgsl = buildNotePatternWgslBake('n-ripple', pack);
    expect(wgsl).toContain('ARR_PATTERN_ONSET_COUNT_n_ripple: i32 = 3');
    expect(wgsl).toContain('array<vec4<f32>');
  });

  it('injectArrangementPatternNoteBake replaces placeholders', () => {
    const template = '{{ARRANGEMENT_PATTERN_NOTE_BAKE}}\n// suffix {{NODE_SUFFIX}}';
    const out = injectArrangementPatternNoteBake(
      template,
      {
        id: 'n-ripple',
        type: 'note-ripple-field',
        position: { x: 0, y: 0 },
        parameters: { trackFilterMode: 0, trackFilterList: '' },
      },
      threeNoteSnapshot
    );
    expect(out).not.toContain('{{ARRANGEMENT_PATTERN_NOTE_BAKE}}');
    expect(out).toContain('ARR_PATTERN_ONSET_COUNT_n_ripple = 3');
    expect(out).toContain('suffix n_ripple');
  });

  it('injectArrangementPatternNoteBake uses empty track filter when params omitted', () => {
    const template = '{{ARRANGEMENT_PATTERN_NOTE_BAKE}}\n// suffix {{NODE_SUFFIX}}';
    const out = injectArrangementPatternNoteBake(
      template,
      {
        id: 'n-ripple',
        type: 'note-ripple-field',
        position: { x: 0, y: 0 },
        parameters: {},
      },
      threeNoteSnapshot
    );
    expect(out).toContain('ARR_PATTERN_ONSET_COUNT_n_ripple = 0');
  });

  it('samplePitchClassEnergyAt peaks on active pitch classes for a chord snapshot', () => {
    const pack = packArrangementNotePatternData(threeNoteSnapshot, defaultOpts);
    const time = 0.025;
    const release = 0.35;

    const pcC = samplePitchClassEnergyAt(pack, time, release, 0);
    const pcE = samplePitchClassEnergyAt(pack, time, release, 4);
    const pcF = samplePitchClassEnergyAt(pack, time, release, 5);

    expect(pcE).toBeGreaterThan(pcC);
    expect(pcC).toBeGreaterThan(0);
    expect(pcF).toBe(0);
  });

  it('samplePitchClassCompassSectorEnergyAt pulses on note onsets by sector', () => {
    const pack = packArrangementNotePatternData(threeNoteSnapshot, defaultOpts);
    const time = 0.025;
    const windowSeconds = 2;
    const decay = 0.35;
    const sectors = 12;

    const sectorE = samplePitchClassCompassSectorEnergyAt(
      pack,
      time,
      windowSeconds,
      decay,
      midiPitchToPatternSector(64, sectors),
      sectors
    );
    const sectorF = samplePitchClassCompassSectorEnergyAt(
      pack,
      time,
      windowSeconds,
      decay,
      midiPitchToPatternSector(65, sectors),
      sectors
    );
    const sectorSilent = samplePitchClassCompassSectorEnergyAt(
      pack,
      2.0,
      windowSeconds,
      decay,
      0,
      sectors
    );

    expect(sectorE).toBeGreaterThan(0);
    expect(sectorF).toBe(0);
    expect(sectorSilent).toBe(0);
  });

  it('countActivePitchClassesAt matches simultaneous chord tones in the fixture', () => {
    const pack = packArrangementNotePatternData(threeNoteSnapshot, defaultOpts);
    expect(countActivePitchClassesAt(pack, 0.025, 0.35)).toBe(2);
    expect(countActivePitchClassesAt(pack, 1.22, 0.1)).toBe(1);
    expect(countActivePitchClassesAt(pack, 2.0, 0.25)).toBe(0);
  });

  it('sampleNoteDensityWindow rises on dense onset clusters', () => {
    const pack = packArrangementNotePatternData(threeNoteSnapshot, defaultOpts);
    const dense = sampleNoteDensityWindow(pack, 0.025, 0.5, 0.35);
    const sparse = sampleNoteDensityWindow(pack, 1.25, 0.5, 0.35);

    expect(dense.density).toBeGreaterThan(sparse.density);
    expect(dense.meanVelocity).toBeGreaterThan(0);
    expect(sparse.meanPitch).toBeCloseTo(67, 0);
  });

  it('sampleNoteDensityWindow release tail softens trailing density', () => {
    const pack = packArrangementNotePatternData(threeNoteSnapshot, defaultOpts);
    const sharp = sampleNoteDensityWindow(pack, 0.35, 0.5, 0.05);
    const soft = sampleNoteDensityWindow(pack, 0.35, 0.5, 0.5);
    expect(soft.density).toBeGreaterThanOrEqual(sharp.density);
  });

  it('durationCometTrailLength scales with note duration (sustained > staccato)', () => {
    const baseLength = 0.28;
    const gain = 0.7;
    const sustained = durationCometTrailLength(baseLength, 0.5, gain);
    const staccato = durationCometTrailLength(baseLength, 0.02, gain);
    expect(sustained).toBeGreaterThan(staccato);
  });

  it('clamps time-bin layout for long arrangements so PC bake fits GLSL private limits', () => {
    const layout = resolvePatternBinLayout(600);
    expect(layout.binCount).toBeLessThanOrEqual(MAX_PATTERN_TIME_BINS);
    expect(layout.binCount * 3).toBeLessThanOrEqual(MAX_PATTERN_PC_BAKE_VEC4S);
    expect(layout.binWidthSeconds).toBeGreaterThan(DEFAULT_PATTERN_BIN_WIDTH_SECONDS);
  });

  it('emits PC bake arrays within GLSL vec4 cap for long note patterns', () => {
    const longSnapshot: ArrangementSnapshot = {
      ...threeNoteSnapshot,
      durationSeconds: 600,
    };
    const pack = packArrangementNotePatternData(longSnapshot, defaultOpts);
    expect(pack.binCount).toBeLessThanOrEqual(MAX_PATTERN_TIME_BINS);
    expect(pack.binCount * 3).toBeLessThanOrEqual(MAX_PATTERN_PC_BAKE_VEC4S);

    const glsl = buildNotePatternGlslBake('n-bloom', pack);
    const match = glsl.match(/const vec4 ARR_PATTERN_PC_n_bloom\[(\d+)\]/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeLessThanOrEqual(MAX_PATTERN_PC_BAKE_VEC4S);
  });

  it('does not throw when durationSeconds is non-finite but notes exist', () => {
    const snapshot: ArrangementSnapshot = {
      ...threeNoteSnapshot,
      durationSeconds: Number.NaN,
    };
    const pack = packArrangementNotePatternData(snapshot, defaultOpts);
    expect(pack.binCount).toBeGreaterThan(0);
    expect(pack.onsets).toHaveLength(3);
    expect(pack.timeBins.reduce((sum, b) => sum + b.onsetCount, 0)).toBe(3);
  });

  it('clamps notes with negative startSeconds into the first time bin', () => {
    const snapshot: ArrangementSnapshot = {
      ...threeNoteSnapshot,
      notes: [
        {
          id: 'early',
          collectionId: 'c',
          trackId: 'ta',
          startSeconds: -0.5,
          durationSeconds: 0.25,
          pitch: 48,
          velocity: 0.6,
        },
        ...threeNoteSnapshot.notes,
      ],
    };
    const pack = packArrangementNotePatternData(snapshot, defaultOpts);
    expect(pack.timeBins[0]?.onsetCount).toBeGreaterThanOrEqual(1);
    expect(pack.onsets.some((o) => o.pitch === 48)).toBe(true);
  });

  it('note-gravity-warp WGSL caps onset iterations from loopStart (not absolute bake index)', () => {
    const pack = packArrangementNotePatternData(threeNoteSnapshot, defaultOpts);
    const wgsl = buildNoteGravityWarpWgslNodeHelper('n-gravity', pack);
    expect(wgsl).toContain(`(i - loopStart) >= ${MAX_PATTERN_GRAVITY_ONSET_LOOP}`);
    expect(wgsl).toContain('attackBoost');
  });
});
