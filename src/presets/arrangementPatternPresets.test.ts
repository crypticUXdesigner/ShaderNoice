/**
 * Regenerates arrangement pattern demo presets with embedded spike fixture snapshot.
 * Run: npx vitest run src/presets/arrangementPatternPresets.test.ts
 */
import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildArrangementSnapshot } from '../audiotool/arrangement/buildArrangementSnapshot';
import type { RawArrangementEntities } from '../audiotool/arrangement/rawEntities';
import spikeFixture from '../audiotool/arrangement/__fixtures__/spike-arrangement-raw.json';
import { serializeGraph } from '../data-model/serialization';
import { createEmptyGraph } from '../data-model/utils';
import type { NodeGraph } from '../data-model/types';
import type { AudioSetup } from '../data-model/audioSetupTypes';

const __dirname = dirname(fileURLToPath(import.meta.url));
const snapshot = buildArrangementSnapshot(spikeFixture as RawArrangementEntities);

function demoAudioSetup(): AudioSetup {
  return {
    files: [],
    bands: [],
    remappers: [],
    primarySource: { type: 'playlist', trackId: snapshot.source.trackName },
    arrangementSnapshot: snapshot,
    arrangementImportedAt: '2026-05-30T12:00:00.000Z',
  };
}

function baseViewState() {
  return { zoom: 0.85, panX: 200, panY: 80, selectedNodeIds: [] as string[] };
}

function writePreset(filename: string, graph: NodeGraph, audioSetup: AudioSetup) {
  const json = serializeGraph(graph, false, audioSetup);
  writeFileSync(join(__dirname, filename), `${JSON.stringify(JSON.parse(json), null, 2)}\n`, 'utf8');
}

function demoTrackFilter() {
  return { trackFilterMode: 0, trackFilterList: '' };
}

describe('arrangement pattern preset fixtures', () => {
  it('writes arrangement pattern demo presets', () => {
    const rippleGraph: NodeGraph = {
      ...createEmptyGraph('Note Ripple Field Demo'),
      nodes: [
        { id: 'node-uv', type: 'uv-coordinates', position: { x: -900, y: 0 }, parameters: {} },
        {
          id: 'node-ripple',
          type: 'note-ripple-field',
          position: { x: -300, y: 0 },
          parameters: {
            windowSeconds: 2.5,
            speed: 0.4,
            width: 0.03,
            feather: 0.02,
            pitchSpread: 0.45,
            centerX: 0.5,
            centerY: 0.5,
            ...demoTrackFilter(),
          },
        },
        {
          id: 'node-lut',
          type: 'color-lut',
          position: { x: 350, y: 0 },
          parameters: { preset: 5, reverse: 0, gamma: 1.0, contrast: 0.15, intensity: 1.0 },
        },
        { id: 'node-output', type: 'final-output', position: { x: 950, y: 0 }, parameters: {} },
      ],
      connections: [
        {
          id: 'c1',
          sourceNodeId: 'node-uv',
          sourcePort: 'out',
          targetNodeId: 'node-ripple',
          targetPort: 'in',
        },
        {
          id: 'c2',
          sourceNodeId: 'node-ripple',
          sourcePort: 'out',
          targetNodeId: 'node-lut',
          targetPort: 'in',
        },
        {
          id: 'c3',
          sourceNodeId: 'node-lut',
          sourcePort: 'out',
          targetNodeId: 'node-output',
          targetPort: 'in',
        },
      ],
      viewState: baseViewState(),
    };

    const showcaseGraph: NodeGraph = {
      ...createEmptyGraph('Arrangement Patterns Showcase'),
      nodes: [
        { id: 'node-uv', type: 'uv-coordinates', position: { x: -1200, y: 0 }, parameters: {} },
        {
          id: 'node-ripple',
          type: 'note-ripple-field',
          position: { x: -600, y: -320 },
          parameters: { windowSeconds: 2.0, speed: 0.35, pitchSpread: 0.42, ...demoTrackFilter() },
        },
        {
          id: 'node-compass',
          type: 'pitch-class-compass',
          position: { x: -600, y: -80 },
          parameters: {
            windowSeconds: 2,
            decay: 0.35,
            sectors: 12,
            innerRadius: 0.08,
            outerRadius: 0.48,
            ...demoTrackFilter(),
          },
        },
        {
          id: 'node-stripes',
          type: 'rhythm-stripe-field',
          position: { x: 0, y: -320 },
          parameters: { baseScale: 8, warpAmount: 0.03, densityGain: 5, bendGain: 0.6, window: 1, release: 0.35, ...demoTrackFilter() },
        },
        {
          id: 'node-sparks',
          type: 'velocity-spark-grid',
          position: { x: 0, y: -80 },
          parameters: { gridScale: 16, decay: 1.5, dotSize: 1.0, ...demoTrackFilter() },
        },
        {
          id: 'node-halo',
          type: 'track-halo-lattice',
          position: { x: 0, y: 160 },
          parameters: { decay: 2.0, haloSize: 0.14, trackSpread: 0.55, ...demoTrackFilter() },
        },
        {
          id: 'node-shutter',
          type: 'boundary-shutter-rays',
          position: { x: 600, y: -320 },
          parameters: { window: 3.0, rayCount: 24, spin: 0.15, ...demoTrackFilter() },
        },
        {
          id: 'node-comets',
          type: 'duration-comet-trails',
          position: { x: 600, y: -80 },
          parameters: { trailTime: 2.5, bend: 0.35, length: 0.32, ...demoTrackFilter() },
        },
        {
          id: 'node-voronoi',
          type: 'chord-voronoi-bloom',
          position: { x: 600, y: 160 },
          parameters: { release: 0.4, edgeWidth: 0.025, fill: 0.65, ...demoTrackFilter() },
        },
        {
          id: 'node-gravity',
          type: 'note-gravity-warp',
          position: { x: 1200, y: -160 },
          parameters: {
            windowSeconds: 1.5,
            strength: 0.12,
            reach: 0.18,
            swirl: 0.35,
            ...demoTrackFilter(),
          },
        },
        {
          id: 'node-lut',
          type: 'color-lut',
          position: { x: 1800, y: 0 },
          parameters: { preset: 8, reverse: 0, gamma: 1.0, contrast: 0.1, intensity: 1.0 },
        },
        {
          id: 'node-mix',
          type: 'mix',
          position: { x: 1200, y: 160 },
          parameters: { t: 0.55 },
        },
        { id: 'node-output', type: 'final-output', position: { x: 2400, y: 0 }, parameters: {} },
      ],
      connections: [
        { id: 'c-uv-ripple', sourceNodeId: 'node-uv', sourcePort: 'out', targetNodeId: 'node-ripple', targetPort: 'in' },
        { id: 'c-uv-compass', sourceNodeId: 'node-uv', sourcePort: 'out', targetNodeId: 'node-compass', targetPort: 'in' },
        { id: 'c-uv-stripes', sourceNodeId: 'node-uv', sourcePort: 'out', targetNodeId: 'node-stripes', targetPort: 'in' },
        { id: 'c-uv-sparks', sourceNodeId: 'node-uv', sourcePort: 'out', targetNodeId: 'node-sparks', targetPort: 'in' },
        { id: 'c-uv-halo', sourceNodeId: 'node-uv', sourcePort: 'out', targetNodeId: 'node-halo', targetPort: 'in' },
        { id: 'c-uv-shutter', sourceNodeId: 'node-uv', sourcePort: 'out', targetNodeId: 'node-shutter', targetPort: 'in' },
        { id: 'c-uv-comets', sourceNodeId: 'node-uv', sourcePort: 'out', targetNodeId: 'node-comets', targetPort: 'in' },
        { id: 'c-uv-voronoi', sourceNodeId: 'node-uv', sourcePort: 'out', targetNodeId: 'node-voronoi', targetPort: 'in' },
        { id: 'c-uv-gravity', sourceNodeId: 'node-uv', sourcePort: 'out', targetNodeId: 'node-gravity', targetPort: 'in' },
        { id: 'c-ripple-mix', sourceNodeId: 'node-ripple', sourcePort: 'out', targetNodeId: 'node-mix', targetPort: 'a' },
        { id: 'c-voronoi-mix', sourceNodeId: 'node-voronoi', sourcePort: 'out', targetNodeId: 'node-mix', targetPort: 'b' },
        { id: 'c-mix-lut', sourceNodeId: 'node-mix', sourcePort: 'out', targetNodeId: 'node-lut', targetPort: 'in' },
        { id: 'c-lut-out', sourceNodeId: 'node-lut', sourcePort: 'out', targetNodeId: 'node-output', targetPort: 'in' },
      ],
      viewState: { zoom: 0.45, panX: 400, panY: 200, selectedNodeIds: [] },
    };

    const noteGravityWarpDemoGraph: NodeGraph = {
      ...createEmptyGraph('Note Gravity Warp Demo'),
      nodes: [
        { id: 'node-uv', type: 'uv-coordinates', position: { x: -1500, y: 0 }, parameters: {} },
        {
          id: 'node-gravity',
          type: 'note-gravity-warp',
          position: { x: -900, y: 0 },
          parameters: {
            windowSeconds: 2.0,
            strength: 0.16,
            reach: 0.26,
            swirl: 0.5,
            maxWarp: 0.16,
            centerX: 0.5,
            centerY: 0.5,
            ...demoTrackFilter(),
          },
        },
        {
          id: 'node-split-warp',
          type: 'split-vector',
          position: { x: -500, y: -160 },
          parameters: {},
        },
        {
          id: 'node-displace',
          type: 'displace',
          position: { x: -500, y: 80 },
          parameters: {
            displaceMode: 0,
            displaceScale: 2.5,
            offsetX: 0,
            offsetY: 0,
          },
        },
        {
          id: 'node-stripes',
          type: 'stripes',
          position: { x: 0, y: 80 },
          parameters: {
            waveScale: 1.0,
            waveFrequency: 14,
            waveAmplitude: 1.0,
            waveDirection: 35,
            waveIntensity: 1.0,
          },
        },
        {
          id: 'node-lut',
          type: 'color-lut',
          position: { x: 500, y: 80 },
          parameters: { preset: 5, reverse: 0, gamma: 1.0, contrast: 0.12, intensity: 1.0 },
        },
        {
          id: 'node-black',
          type: 'constant-vec3',
          position: { x: 500, y: -160 },
          parameters: { x: 0, y: 0, z: 0 },
        },
        {
          id: 'node-mix',
          type: 'mix',
          position: { x: 900, y: 0 },
          parameters: { a: 0, b: 1, t: 0.5 },
        },
        { id: 'node-output', type: 'final-output', position: { x: 1300, y: 0 }, parameters: {} },
      ],
      connections: [
        {
          id: 'c-uv-gravity',
          sourceNodeId: 'node-uv',
          sourcePort: 'out',
          targetNodeId: 'node-gravity',
          targetPort: 'in',
        },
        {
          id: 'c-uv-displace',
          sourceNodeId: 'node-uv',
          sourcePort: 'out',
          targetNodeId: 'node-displace',
          targetPort: 'in',
        },
        {
          id: 'c-warp-split',
          sourceNodeId: 'node-gravity',
          sourcePort: 'warp',
          targetNodeId: 'node-split-warp',
          targetPort: 'in',
        },
        {
          id: 'c-split-offset-x',
          sourceNodeId: 'node-split-warp',
          sourcePort: 'x',
          targetNodeId: 'node-displace',
          targetParameter: 'offsetX',
        },
        {
          id: 'c-split-offset-y',
          sourceNodeId: 'node-split-warp',
          sourcePort: 'y',
          targetNodeId: 'node-displace',
          targetParameter: 'offsetY',
        },
        {
          id: 'c-displace-stripes',
          sourceNodeId: 'node-displace',
          sourcePort: 'out',
          targetNodeId: 'node-stripes',
          targetPort: 'in',
        },
        {
          id: 'c-stripes-lut',
          sourceNodeId: 'node-stripes',
          sourcePort: 'out',
          targetNodeId: 'node-lut',
          targetPort: 'in',
        },
        {
          id: 'c-black-mix',
          sourceNodeId: 'node-black',
          sourcePort: 'out',
          targetNodeId: 'node-mix',
          targetPort: 'a',
        },
        {
          id: 'c-lut-mix',
          sourceNodeId: 'node-lut',
          sourcePort: 'out',
          targetNodeId: 'node-mix',
          targetPort: 'b',
        },
        {
          id: 'c-value-mix',
          sourceNodeId: 'node-gravity',
          sourcePort: 'out',
          targetNodeId: 'node-mix',
          targetPort: 't',
        },
        {
          id: 'c-mix-out',
          sourceNodeId: 'node-mix',
          sourcePort: 'out',
          targetNodeId: 'node-output',
          targetPort: 'in',
        },
      ],
      viewState: baseViewState(),
    };

    writePreset('note-ripple-field-demo.json', rippleGraph, demoAudioSetup());
    writePreset('arrangement-patterns-showcase.json', showcaseGraph, demoAudioSetup());
    writePreset('note-gravity-warp-demo.json', noteGravityWarpDemoGraph, demoAudioSetup());

    expect(snapshot.notes?.length).toBeGreaterThan(0);
  });
});
