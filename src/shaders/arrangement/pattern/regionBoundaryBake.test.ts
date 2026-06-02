import { describe, it, expect } from 'vitest';
import { buildArrangementSnapshot } from '../../../audiotool/arrangement/buildArrangementSnapshot';
import type { RawArrangementEntities } from '../../../audiotool/arrangement/rawEntities';
import type { ArrangementSnapshot } from '../../../audiotool/arrangement/types';
import spikeFixture from '../../../audiotool/arrangement/__fixtures__/spike-arrangement-raw.json';
import { MAX_PATTERN_BOUNDARY_EVENTS, MAX_PATTERN_TRACK_LOOP } from './constants';
import {
  buildRegionPatternGlslBake,
  buildRegionPatternWgslBake,
  findBoundaryIndexRangeForWindow,
  injectArrangementPatternRegionBake,
  packArrangementRegionBoundariesForGlsl,
  packArrangementRegionPatternData,
  packArrangementTrackEnergyBinsForGlsl,
  readRegionKindFilterOptions,
  sampleTrackEnergyAt,
} from './index';

const raw = spikeFixture as RawArrangementEntities;
const snapshot = buildArrangementSnapshot(raw);

const defaultOpts = { trackFilterMode: 0, trackFilterList: '' };

const regionSnapshot: ArrangementSnapshot = {
  tracks: [
    { id: 't-note', kind: 'note', orderAmongTracks: 0, enabled: true },
    { id: 't-audio', kind: 'audio', orderAmongTracks: 1, enabled: true },
  ],
  regions: [
    {
      id: 'r1',
      trackId: 't-note',
      kind: 'note',
      startSeconds: 0,
      durationSeconds: 2,
      enabled: true,
    },
    {
      id: 'r2',
      trackId: 't-audio',
      kind: 'audio',
      startSeconds: 1,
      durationSeconds: 1.5,
      enabled: true,
    },
  ],
  notes: [
    {
      id: 'n1',
      collectionId: 'c',
      trackId: 't-note',
      startSeconds: 0.1,
      durationSeconds: 0.4,
      pitch: 60,
      velocity: 0.8,
    },
    {
      id: 'n2',
      collectionId: 'c',
      trackId: 't-note',
      startSeconds: 0.5,
      durationSeconds: 0.3,
      pitch: 64,
      velocity: 1.0,
    },
  ],
  bpm: 120,
  durationSeconds: 4,
  timeSignature: { numerator: 4, denominator: 4 },
  source: { trackName: 'tracks/t', projectName: 'projects/p', commitIndex: 0 },
};

describe('regionBoundaryBake', () => {
  it('returns zero counts for missing snapshot', () => {
    const pack = packArrangementRegionPatternData(undefined, defaultOpts);
    expect(pack.boundaries).toHaveLength(0);
    expect(pack.trackCount).toBe(0);
    expect(pack.binCount).toBe(0);
    expect(pack.trackEnergyBins).toHaveLength(0);
  });

  it('emits start and end boundary events sorted by time', () => {
    const { boundaries } = packArrangementRegionBoundariesForGlsl(regionSnapshot, defaultOpts);
    expect(boundaries).toHaveLength(4);
    expect(boundaries[0]).toMatchObject({ time: 0, isEnd: 0, kind: 0 });
    expect(boundaries[1]).toMatchObject({ time: 1, isEnd: 0, kind: 1 });
    expect(boundaries[2]).toMatchObject({ time: 2, isEnd: 1, kind: 0 });
    expect(boundaries[3]).toMatchObject({ time: 2.5, isEnd: 1, kind: 1 });

    for (let i = 1; i < boundaries.length; i++) {
      expect(boundaries[i]!.time).toBeGreaterThanOrEqual(boundaries[i - 1]!.time);
    }
  });

  it('caps boundary events at MAX_PATTERN_BOUNDARY_EVENTS', () => {
    const manyRegions: ArrangementSnapshot = {
      ...regionSnapshot,
      regions: Array.from({ length: 200 }, (_, i) => ({
        id: `r-${i}`,
        trackId: 't-note',
        kind: 'note' as const,
        startSeconds: i * 0.01,
        durationSeconds: 0.005,
        enabled: true,
      })),
    };
    const { boundaries } = packArrangementRegionBoundariesForGlsl(manyRegions, defaultOpts);
    expect(boundaries.length).toBeLessThanOrEqual(MAX_PATTERN_BOUNDARY_EVENTS);
  });

  it('packs per-track energy bins from notes', () => {
    const energy = packArrangementTrackEnergyBinsForGlsl(regionSnapshot, defaultOpts);
    expect(energy.trackCount).toBe(2);
    expect(energy.binCount).toBeGreaterThan(0);
    expect(energy.trackEnergyBins).toHaveLength(energy.trackCount * energy.binCount);

    const track0Bins = energy.trackEnergyBins.slice(0, energy.binCount);
    const occupied = track0Bins.filter((b) => b.energy > 0);
    expect(occupied.length).toBeGreaterThan(0);
    expect(Math.max(...occupied.map((b) => b.maxVelocity))).toBeCloseTo(1.0, 5);
  });

  it('sampleTrackEnergyAt peaks on active track bins with decay tail', () => {
    const pack = packArrangementRegionPatternData(regionSnapshot, defaultOpts);
    const atHit = sampleTrackEnergyAt(pack, 0, 0.3, 0.5);
    expect(atHit.energy).toBeGreaterThan(0);
    expect(atHit.meanPitch).toBeGreaterThan(0);
    const beforeNotes = sampleTrackEnergyAt(pack, 0, 0.05, 0.5);
    expect(beforeNotes.energy).toBe(0);
  });

  it('limits baked tracks to MAX_PATTERN_TRACK_LOOP', () => {
    const pack = packArrangementRegionPatternData(snapshot, defaultOpts);
    expect(pack.trackCount).toBeLessThanOrEqual(MAX_PATTERN_TRACK_LOOP);
  });

  it('findBoundaryIndexRangeForWindow selects events by time', () => {
    const { boundaries } = packArrangementRegionBoundariesForGlsl(regionSnapshot, defaultOpts);
    const early = findBoundaryIndexRangeForWindow(boundaries, 0, 0.5);
    expect(early.end - early.start).toBe(1);
    const mid = findBoundaryIndexRangeForWindow(boundaries, 0.9, 1.1);
    expect(mid.end - mid.start).toBe(1);
  });

  it('readRegionKindFilterOptions parses kindFilter param', () => {
    expect(readRegionKindFilterOptions({ id: 'n', type: 'x', position: { x: 0, y: 0 }, parameters: {} })).toBe(-1);
    expect(
      readRegionKindFilterOptions({
        id: 'n',
        type: 'x',
        position: { x: 0, y: 0 },
        parameters: { kindFilter: 1 },
      })
    ).toBe(1);
  });

  it('emits GLSL and WGSL region bake constants', () => {
    const pack = packArrangementRegionPatternData(regionSnapshot, defaultOpts);
    const boundaryParts = { includeBoundaries: true, includeTrackEnergy: false };
    const trackParts = { includeBoundaries: false, includeTrackEnergy: true };

    const glslBoundary = buildRegionPatternGlslBake('r-contour', pack, boundaryParts);
    expect(glslBoundary).toContain('ARR_PATTERN_BOUNDARY_COUNT_r_contour = 4');
    expect(glslBoundary).toContain('ARR_PATTERN_BOUNDARIES_r_contour');
    expect(glslBoundary).not.toContain('ARR_PATTERN_TRACK_ENERGY_r_contour');

    const glslTrack = buildRegionPatternGlslBake('r-halo', pack, trackParts);
    expect(glslTrack).toContain('ARR_PATTERN_TRACK_COUNT_r_halo = 2');
    expect(glslTrack).toContain('ARR_PATTERN_TRACK_ENERGY_r_halo');
    expect(glslTrack).not.toContain('ARR_PATTERN_BOUNDARIES_r_halo');

    const wgslBoundary = buildRegionPatternWgslBake('r-contour', pack, boundaryParts);
    expect(wgslBoundary).toContain('ARR_PATTERN_BOUNDARY_COUNT_r_contour: i32 = 4');
    expect(wgslBoundary).toContain('array<vec4<f32>');
    expect(wgslBoundary).not.toContain('array<vec3<f32>');

    const wgslTrack = buildRegionPatternWgslBake('r-halo', pack, trackParts);
    expect(wgslTrack).toContain('array<vec3<f32>');
    expect(wgslTrack).not.toContain('array<vec4<f32>');
  });

  it('injectArrangementPatternRegionBake replaces placeholders', () => {
    const template = '{{ARRANGEMENT_PATTERN_REGION_BAKE}}\n// suffix {{NODE_SUFFIX}}';
    const out = injectArrangementPatternRegionBake(
      template,
      {
        id: 'r-contour',
        type: 'boundary-shutter-rays',
        position: { x: 0, y: 0 },
        parameters: { trackFilterMode: 0, trackFilterList: '' },
      },
      regionSnapshot
    );
    expect(out).not.toContain('{{ARRANGEMENT_PATTERN_REGION_BAKE}}');
    expect(out).toContain('ARR_PATTERN_BOUNDARY_COUNT_r_contour = 4');
    expect(out).not.toContain('ARR_PATTERN_TRACK_ENERGY_r_contour');
    expect(out).toContain('suffix r_contour');
  });

  it('injectArrangementPatternRegionBake uses empty track filter when params omitted', () => {
    const template = '{{ARRANGEMENT_PATTERN_REGION_BAKE}}\n// suffix {{NODE_SUFFIX}}';
    const out = injectArrangementPatternRegionBake(
      template,
      {
        id: 'r-contour',
        type: 'boundary-shutter-rays',
        position: { x: 0, y: 0 },
        parameters: {},
      },
      regionSnapshot
    );
    expect(out).toContain('ARR_PATTERN_BOUNDARY_COUNT_r_contour = 0');
  });

  it('spike fixture produces monotonic boundary times', () => {
    const { boundaries } = packArrangementRegionBoundariesForGlsl(snapshot, defaultOpts);
    expect(boundaries.length).toBeGreaterThan(0);
    for (let i = 1; i < boundaries.length; i++) {
      expect(boundaries[i]!.time).toBeGreaterThanOrEqual(boundaries[i - 1]!.time);
    }
  });
});
