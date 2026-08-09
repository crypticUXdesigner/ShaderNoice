import { describe, expect, it } from 'vitest';

import { OfflineAudioProvider } from '../../video-export/OfflineAudioProvider';
import { AudioAnalysisCurveSampler } from './AudioAnalysisCurveSampler';
import {
  buildFullAnalysisCache,
  computeAnalysisFrameCount,
} from './audioAnalysisBuildCore';
import {
  EXPORT_ANALYSIS_HOP_SECONDS,
  EXPORT_ANALYSIS_RATE_HZ,
  PREVIEW_ANALYSIS_HOP_SECONDS,
  PREVIEW_ANALYSIS_RATE_HZ,
  analysisPartialPublishEveryFrames,
} from './audioAnalysisRates';

function makeTestPcm(sampleRate: number, durationSeconds: number): Float32Array[] {
  const length = Math.floor(sampleRate * durationSeconds);
  const ch = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    // Mix of tones so band energy is non-trivial.
    const t = i / sampleRate;
    ch[i] = 0.4 * Math.sin(2 * Math.PI * 220 * t) + 0.3 * Math.sin(2 * Math.PI * 880 * t);
  }
  return [ch];
}

function makeMockAudioBuffer(pcm: Float32Array[], sampleRate: number): AudioBuffer {
  const length = pcm[0]?.length ?? 0;
  return {
    sampleRate,
    numberOfChannels: pcm.length,
    length,
    duration: length / sampleRate,
    getChannelData(ch: number) {
      return pcm[ch] ?? new Float32Array(0);
    },
  } as unknown as AudioBuffer;
}

const SAMPLE_RATE = 48_000;
const DURATION = 0.5;

const analyzerConfigs = [
  {
    nodeId: 'band-1',
    frequencyBands: [{ minHz: 100, maxHz: 400 }],
    bandModes: ['mean' as const],
    spectrumFftSize: 4096,
    mappingFftSize: 2048,
    smoothingHalfLifeSeconds: [1 / 120],
    bandRemap: [{ inMin: 0, inMax: 1, outMin: 0, outMax: 1 }],
  },
];

describe('audioAnalysisRates', () => {
  it('documents preview vs export hop (preview cheaper)', () => {
    expect(PREVIEW_ANALYSIS_RATE_HZ).toBe(60);
    expect(EXPORT_ANALYSIS_RATE_HZ).toBe(120);
    expect(PREVIEW_ANALYSIS_HOP_SECONDS).toBeCloseTo(1 / 60, 10);
    expect(EXPORT_ANALYSIS_HOP_SECONDS).toBeCloseTo(1 / 120, 10);
    expect(PREVIEW_ANALYSIS_RATE_HZ).toBeLessThan(EXPORT_ANALYSIS_RATE_HZ);
  });

  it('halves FFT frame count when hop drops from export to preview rate', () => {
    const duration = 10;
    const exportCount = computeAnalysisFrameCount({
      startTimeSeconds: 0,
      hopHz: EXPORT_ANALYSIS_RATE_HZ,
      frameRateForDuration: EXPORT_ANALYSIS_RATE_HZ,
      maxFrames: Math.ceil(duration * EXPORT_ANALYSIS_RATE_HZ) + 2,
    }).frameCount;
    const previewCount = computeAnalysisFrameCount({
      startTimeSeconds: 0,
      hopHz: PREVIEW_ANALYSIS_RATE_HZ,
      frameRateForDuration: PREVIEW_ANALYSIS_RATE_HZ,
      maxFrames: Math.ceil(duration * PREVIEW_ANALYSIS_RATE_HZ) + 2,
    }).frameCount;
    // ~2× fewer hops for the same clip length.
    expect(previewCount).toBeLessThan(exportCount * 0.55);
    expect(previewCount).toBeGreaterThan(exportCount * 0.4);
  });

  it('publishes progressive partials about every 2s of audio', () => {
    expect(analysisPartialPublishEveryFrames(PREVIEW_ANALYSIS_RATE_HZ)).toBe(120);
    expect(analysisPartialPublishEveryFrames(EXPORT_ANALYSIS_RATE_HZ)).toBe(240);
  });
});

describe('live vs export analysis alignment', () => {
  it('same-hop buildFullAnalysisCache matches OfflineAudioProvider band samples (short fixture)', () => {
    const pcm = makeTestPcm(SAMPLE_RATE, DURATION);
    const hopHz = EXPORT_ANALYSIS_RATE_HZ;
    const maxFrames = Math.ceil(DURATION * hopHz) + 2;

    const workerCache = buildFullAnalysisCache({
      pcmChannels: pcm,
      sampleRate: SAMPLE_RATE,
      startTimeSeconds: 0,
      hopHz,
      frameRateForDuration: hopHz,
      maxFrames,
      analyzerConfigs,
      remapperConfigs: [],
    });

    const buffer = makeMockAudioBuffer(pcm, SAMPLE_RATE);
    const provider = new OfflineAudioProvider(buffer, {
      sampleRate: SAMPLE_RATE,
      frameRate: hopHz,
      primaryFileId: 'file-1',
      startTimeSeconds: 0,
      maxFrames,
      analyzerConfigs,
      remapperConfigs: [],
    });

    const live = new AudioAnalysisCurveSampler(workerCache);
    const sampleTimes = [0, 0.1, 0.25, DURATION - 1 / hopHz];
    for (const t of sampleTimes) {
      const liveBand = live.getUniformUpdatesAtTime(t).find((u) => u.paramName === 'band')?.value ?? NaN;
      const exportBand =
        provider.getUniformUpdatesAtTime(t).find((u) => u.paramName === 'band')?.value ?? NaN;
      expect(liveBand).toBeCloseTo(exportBand, 5);
    }
  });

  it('dual-rate contract: preview hop stores hopSeconds; samples remain finite and close on shared grid', () => {
    const pcm = makeTestPcm(SAMPLE_RATE, DURATION);
    const exportMax = Math.ceil(DURATION * EXPORT_ANALYSIS_RATE_HZ) + 2;
    const previewMax = Math.ceil(DURATION * PREVIEW_ANALYSIS_RATE_HZ) + 2;

    const exportCache = buildFullAnalysisCache({
      pcmChannels: pcm,
      sampleRate: SAMPLE_RATE,
      startTimeSeconds: 0,
      hopHz: EXPORT_ANALYSIS_RATE_HZ,
      frameRateForDuration: EXPORT_ANALYSIS_RATE_HZ,
      maxFrames: exportMax,
      analyzerConfigs,
      remapperConfigs: [],
    });
    const previewCache = buildFullAnalysisCache({
      pcmChannels: pcm,
      sampleRate: SAMPLE_RATE,
      startTimeSeconds: 0,
      hopHz: PREVIEW_ANALYSIS_RATE_HZ,
      frameRateForDuration: PREVIEW_ANALYSIS_RATE_HZ,
      maxFrames: previewMax,
      analyzerConfigs,
      remapperConfigs: [],
    });

    expect(exportCache.hopSeconds).toBeCloseTo(EXPORT_ANALYSIS_HOP_SECONDS, 10);
    expect(previewCache.hopSeconds).toBeCloseTo(PREVIEW_ANALYSIS_HOP_SECONDS, 10);
    expect(previewCache.frameCount).toBeLessThan(exportCache.frameCount);

    const exportSampler = new AudioAnalysisCurveSampler(exportCache);
    const previewSampler = new AudioAnalysisCurveSampler(previewCache);

    // Shared 60 Hz grid points land on both caches; smoothing may differ slightly.
    let maxAbs = 0;
    for (let i = 0; i < 10; i++) {
      const t = i / PREVIEW_ANALYSIS_RATE_HZ;
      if (t > DURATION) break;
      const a = exportSampler.getUniformUpdatesAtTime(t).find((u) => u.paramName === 'band')?.value ?? 0;
      const b = previewSampler.getUniformUpdatesAtTime(t).find((u) => u.paramName === 'band')?.value ?? 0;
      expect(Number.isFinite(a)).toBe(true);
      expect(Number.isFinite(b)).toBe(true);
      maxAbs = Math.max(maxAbs, Math.abs(a - b));
    }
    // Intentional fidelity delta — not bit-identical; keep within a loose envelope.
    expect(maxAbs).toBeLessThan(0.35);
  });

  it('progressive onPartialCache publishes growing prefixes without mutating final values', () => {
    const pcm = makeTestPcm(SAMPLE_RATE, 3);
    const hopHz = PREVIEW_ANALYSIS_RATE_HZ;
    const maxFrames = Math.ceil(3 * hopHz) + 2;
    const partials: number[] = [];

    const cache = buildFullAnalysisCache({
      pcmChannels: pcm,
      sampleRate: SAMPLE_RATE,
      startTimeSeconds: 0,
      hopHz,
      frameRateForDuration: hopHz,
      maxFrames,
      analyzerConfigs,
      remapperConfigs: [],
      onPartialCache: (partial) => {
        partials.push(partial.frameCount);
        expect(partial.frameCount).toBeGreaterThanOrEqual(2);
        expect(partial.values.length).toBe(partial.frameCount * partial.channels.length);
        return true;
      },
    });

    expect(partials.length).toBeGreaterThan(0);
    expect(partials.every((n, i) => i === 0 || n > partials[i - 1]!)).toBe(true);
    expect(cache.frameCount).toBeGreaterThan(partials[partials.length - 1]!);

    const baseline = buildFullAnalysisCache({
      pcmChannels: pcm,
      sampleRate: SAMPLE_RATE,
      startTimeSeconds: 0,
      hopHz,
      frameRateForDuration: hopHz,
      maxFrames,
      analyzerConfigs,
      remapperConfigs: [],
    });
    expect(cache.frameCount).toBe(baseline.frameCount);
    expect(cache.values).toEqual(baseline.values);
  });
});
