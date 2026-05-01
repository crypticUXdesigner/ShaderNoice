/**
 * Offline Audio Provider - Per-frame audio state for video export
 *
 * Given the primary audio file's AudioBuffer, sample rate, frame rate, and audioSetup
 * (for band/remapper config), produces per-frame state: raw channel samples for
 * the export file and FFT-derived band values (and remapped values) for shader uniforms.
 * No dependency on live AudioManager or DOM.
 *
 * WP 15B: Reads from audioSetup instead of graph nodes.
 */

import type { AudioSetup } from '../data-model/audioSetupTypes';

// --- Types (API for 02B / 03) ---

export interface FrameAudioState {
  /**
   * One Float32Array per channel for this frame's audio chunk.
   * Length can vary by ±1 sample depending on sampleRate/frameRate rounding.
   */
  channelSamples: Float32Array[];
  /** Uniform updates: { nodeId, paramName, value } — apply via setAudioUniform / setParameters */
  uniformUpdates: Array<{ nodeId: string; paramName: string; value: number }>;
  /** Timeline currentTime for this frame (seconds). Used as uTimelineTime so automation stays in sync (WP 07). */
  timelineTime: number;
}

export interface UniformUpdate {
  nodeId: string;
  paramName: string;
  value: number;
}

/** Per-band config derived from audioSetup (WP 15B) */
export interface AnalyzerConfig {
  nodeId: string;
  frequencyBands: Array<{ minHz: number; maxHz: number }>;
  /** Per-band smoothing (0–1). Length matches band count. */
  smoothing: number[];
  /**
   * FFT size used to compute the underlying spectrum (matches the live AnalyserNode's fftSize).
   * Live uses 4096 in AudioManager.loadAudioFile().
   */
  spectrumFftSize: number;
  /**
   * FFT size used for Hz→bin mapping (matches what live code currently uses when extracting bands).
   * Note: live stores this per band (often 2048) even though the underlying AnalyserNode is 4096.
   * To match preview, export mirrors this behavior.
   */
  mappingFftSize: number;
  bandRemap: Array<{ inMin: number; inMax: number; outMin: number; outMax: number }>;
}

export interface OfflineAudioProviderConfig {
  sampleRate: number;
  frameRate: number;
  /** Primary file id (from audioSetup.files[0]) */
  primaryFileId: string;
  /** Start time offset (seconds) for export (seek); uniforms and FFT sample at absolute time. */
  startTimeSeconds?: number;
  /** Band configs from audioSetup (filtered by primary file) */
  analyzerConfigs: AnalyzerConfig[];
  /** Remapper configs from audioSetup */
  remapperConfigs: Array<{ id: string; bandId: string; inMin: number; inMax: number; outMin: number; outMax: number }>;
}

// --- Offline FFT (radix-2, real input → magnitude spectrum 0–255) ---

const TWO_PI = 2 * Math.PI;

/**
 * In-place radix-2 FFT. Buffer length must be 2 * fftSize (interleaved re, im).
 * Input: real samples in buffer[0], buffer[2], ... buffer[2*(fftSize-1)]; imaginary = 0.
 * Output: complex spectrum in same buffer (re, im interleaved).
 */
function fftInPlace(buffer: Float32Array, fftSize: number): void {
  const n = fftSize;
  if (n <= 1) return;

  // Bit-reversal permutation (log2(n) bits)
  const log2n = Math.round(Math.log2(n));
  for (let i = 0; i < n; i++) {
    let j = 0;
    for (let b = 0; b < log2n; b++) {
      j |= ((i >> b) & 1) << (log2n - 1 - b);
    }
    if (i < j) {
      const reI = buffer[i * 2];
      const imI = buffer[i * 2 + 1];
      buffer[i * 2] = buffer[j * 2];
      buffer[i * 2 + 1] = buffer[j * 2 + 1];
      buffer[j * 2] = reI;
      buffer[j * 2 + 1] = imI;
    }
  }

  for (let len = 2; len <= n; len *= 2) {
    const half = len / 2;
    const angle = -TWO_PI / len;
    for (let start = 0; start < n; start += len) {
      let wRe = 1;
      let wIm = 0;
      const wReStep = Math.cos(angle);
      const wImStep = Math.sin(angle);
      for (let k = 0; k < half; k++) {
        const i = start + k;
        const j = i + half;
        const reI = buffer[i * 2];
        const imI = buffer[i * 2 + 1];
        const reJ = buffer[j * 2];
        const imJ = buffer[j * 2 + 1];
        const tRe = wRe * reJ - wIm * imJ;
        const tIm = wRe * imJ + wIm * reJ;
        buffer[i * 2] = reI + tRe;
        buffer[i * 2 + 1] = imI + tIm;
        buffer[j * 2] = reI - tRe;
        buffer[j * 2 + 1] = imI - tIm;
        const nextWRe = wRe * wReStep - wIm * wImStep;
        const nextWIm = wRe * wImStep + wIm * wReStep;
        wRe = nextWRe;
        wIm = nextWIm;
      }
    }
  }
}

/**
 * Apply Blackman window to real samples in workBuffer (in-place).
 * workBuffer layout: [re0, im0, re1, im1, ...]; only re values are used for windowing.
 *
 * WebAudio AnalyserNode uses a Blackman window internally; using it offline improves
 * audio-reactive visual fidelity between preview and export.
 */
function applyBlackmanWindow(workBuffer: Float32Array, fftSize: number): void {
  if (fftSize <= 1) return;
  const nMinus1 = fftSize - 1;
  const a0 = 0.42;
  const a1 = 0.5;
  const a2 = 0.08;
  for (let i = 0; i < fftSize; i++) {
    const phase = (TWO_PI * i) / nMinus1;
    const w = a0 - a1 * Math.cos(phase) + a2 * Math.cos(2 * phase);
    workBuffer[i * 2] *= w;
  }
}

// AnalyserNode defaults: getByteFrequencyData returns dB mapped to 0–255 with this range
const ANALYSER_MIN_DB = -100;
const ANALYSER_MAX_DB = -30;
// Live playback uses AnalyserNode.smoothingTimeConstant = 0.8 (see AudioManager.loadAudioFile()).
// We approximate that internal smoothing stage offline so band values more closely match preview.
const ANALYSER_SMOOTHING_TIME_CONSTANT = 0.8;

/**
 * Compute frequency spectrum (0–255) from buffer at time t.
 * Uses a window of fftSize samples ending at sample index t * sampleRate (closer to AnalyserNode's internal buffer).
 * Applies Blackman window and outputs decibel-scaled bytes to match AnalyserNode.getByteFrequencyData(),
 * so export audio reactivity matches live (same 0–255 range and log scale).
 * Mono: uses channel 0. Multi-channel: averages channels (approximates WebAudio mixdown).
 */
function computeMagnitudeSpectrum(
  buffer: AudioBuffer,
  timeSeconds: number,
  sampleRate: number,
  fftSize: number,
  workBuffer: Float32Array
): Uint8Array {
  const frequencyBinCount = fftSize / 2;
  const endSampleExclusive = Math.max(0, Math.floor(timeSeconds * sampleRate));
  const startSample = Math.max(0, endSampleExclusive - fftSize);
  const numberOfChannels = buffer.numberOfChannels;

  // Fill interleaved buffer: real = sample, im = 0; pad with zero if out of range
  for (let i = 0; i < fftSize; i++) {
    const srcIndex = startSample + i;
    if (srcIndex < 0) {
      workBuffer[i * 2] = 0;
    } else if (srcIndex >= buffer.length) {
      workBuffer[i * 2] = 0;
    } else if (numberOfChannels === 1) {
      workBuffer[i * 2] = buffer.getChannelData(0)[srcIndex] ?? 0;
    } else {
      let sum = 0;
      for (let ch = 0; ch < numberOfChannels; ch++) {
        sum += buffer.getChannelData(ch)[srcIndex] ?? 0;
      }
      workBuffer[i * 2] = sum / numberOfChannels;
    }
    workBuffer[i * 2 + 1] = 0;
  }

  // Blackman window to better match WebAudio AnalyserNode
  applyBlackmanWindow(workBuffer, fftSize);

  fftInPlace(workBuffer, fftSize);

  // Match AnalyserNode: magnitude → dB → byte 0–255 (same formula as getByteFrequencyData).
  // Normalize magnitude similar to WebAudio AnalyserNode. Empirically, using a single-sided scaling factor
  // (≈ 2/fftSize) yields much closer band magnitudes to live preview, improving export parity for
  // audio-driven shader motion.
  const out = new Uint8Array(frequencyBinCount);
  const dbRange = ANALYSER_MAX_DB - ANALYSER_MIN_DB;
  const minMagnitude = 1e-10; // avoid log(0) = -Infinity
  for (let k = 0; k < frequencyBinCount; k++) {
    const re = workBuffer[k * 2];
    const im = workBuffer[k * 2 + 1];
    const magnitude = (2 * Math.sqrt(re * re + im * im)) / fftSize;
    const db = 20 * Math.log10(Math.max(minMagnitude, magnitude));
    const clampedDb = Math.max(ANALYSER_MIN_DB, Math.min(ANALYSER_MAX_DB, db));
    const byte = Math.round(255 * (clampedDb - ANALYSER_MIN_DB) / dbRange);
    out[k] = Math.max(0, Math.min(255, byte));
  }
  return out;
}

/**
 * Extract band values from frequency data (same formula as FrequencyAnalyzer.extractFrequencyBands).
 */
function extractFrequencyBandsOffline(
  frequencyData: Uint8Array,
  frequencyBands: Array<{ minHz: number; maxHz: number }>,
  sampleRate: number,
  fftSize: number
): number[] {
  const bandValues: number[] = [];
  for (const band of frequencyBands) {
    const minBin = Math.floor((band.minHz / sampleRate) * fftSize);
    const maxBin = Math.ceil((band.maxHz / sampleRate) * fftSize);
    let sum = 0;
    let count = 0;
    for (let i = minBin; i <= maxBin && i < frequencyData.length; i++) {
      sum += frequencyData[i];
      count++;
    }
    const average = count > 0 ? sum / count : 0;
    const normalized = average / 255.0;
    bandValues.push(normalized);
  }
  return bandValues;
}

// --- OfflineAudioProvider ---

export class OfflineAudioProvider {
  private readonly buffer: AudioBuffer;
  private readonly config: OfflineAudioProviderConfig;
  /** Per-band smoothed values approximating AnalyserNode smoothingTimeConstant (first stage). */
  private readonly analyserSmoothedBandValues: Map<string, number[]> = new Map();
  /** Per-band smoothed values matching the app's per-band smoothing (second stage). */
  private readonly smoothedBandValues: Map<string, number[]> = new Map();
  /** FFT work buffer (reuse to avoid allocations) */
  private readonly fftWorkBuffer: Float32Array;
  /** Reused per-frame channel sample buffers (audio mux input). Sized to max samples per frame. */
  private readonly frameChannelSamples: Float32Array[];
  private readonly maxSamplesPerFrame: number;

  constructor(
    buffer: AudioBuffer,
    config: OfflineAudioProviderConfig
  ) {
    this.buffer = buffer;
    this.config = config;
    const maxFftSize = Math.max(4096, ...this.config.analyzerConfigs.map((a) => a.spectrumFftSize));
    this.fftWorkBuffer = new Float32Array(maxFftSize * 2);
    // Use ceil so we can represent frames where rounding yields +1 sample.
    this.maxSamplesPerFrame = Math.ceil(config.sampleRate / config.frameRate);
    this.frameChannelSamples = Array.from(
      { length: buffer.numberOfChannels },
      () => new Float32Array(this.maxSamplesPerFrame)
    );
  }

  /**
   * Get per-frame audio state for video export.
   * @param frameIndex - Zero-based frame index
   * @returns channelSamples (one Float32Array per channel for this frame) and uniformUpdates
   */
  getFrameState(frameIndex: number): FrameAudioState {
    const { buffer, config } = this;
    const sampleRate = config.sampleRate;
    const frameRate = config.frameRate;
    const startTimeSeconds = config.startTimeSeconds ?? 0;
    const startSampleOffset = Math.round(startTimeSeconds * sampleRate);
    // Compute exact integer sample bounds for this frame so audio stays sample-accurate
    // across the whole export (prevents drift from per-frame rounding).
    const startSample = startSampleOffset + Math.round(frameIndex * sampleRate / frameRate);
    const endSample = startSampleOffset + Math.round((frameIndex + 1) * sampleRate / frameRate);
    // Use sample-accurate time to keep uniforms and analysis aligned with muxed audio.
    const t = startSample / sampleRate;
    const targetLength = Math.max(0, Math.min(this.maxSamplesPerFrame, endSample - startSample));

    const numberOfChannels = this.frameChannelSamples.length;
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const channelData = buffer.getChannelData(ch);
      const out = this.frameChannelSamples[ch];
      for (let i = 0; i < targetLength; i++) {
        const srcIndex = startSample + i;
        out[i] = srcIndex >= 0 && srcIndex < channelData.length ? channelData[srcIndex] : 0;
      }
      // Ensure any leftover samples from previous frames don't leak into this frame.
      for (let i = targetLength; i < out.length; i++) out[i] = 0;
    }

    // Return per-frame views at the correct length (no extra padding).
    const channelSamples = this.frameChannelSamples.map((c) => c.subarray(0, targetLength));

    const uniformUpdates: UniformUpdate[] = [];

    // Primary file uniforms (fileId.currentTime, fileId.duration, fileId.isPlaying)
    uniformUpdates.push(
      { nodeId: config.primaryFileId, paramName: 'currentTime', value: t },
      { nodeId: config.primaryFileId, paramName: 'duration', value: buffer.duration },
      { nodeId: config.primaryFileId, paramName: 'isPlaying', value: 1 }
    );

    // Band FFT and extraction (one FFT per band).
    // Live has two stages: AnalyserNode internal smoothing (smoothingTimeConstant) + app per-band smoothing.
    // We approximate both stages here for closer preview/export parity.
    for (const analyzer of config.analyzerConfigs) {
      const { spectrumFftSize, mappingFftSize, frequencyBands, smoothing, bandRemap } = analyzer;
      const workBuf =
        spectrumFftSize <= this.fftWorkBuffer.length / 2
          ? this.fftWorkBuffer
          : new Float32Array(spectrumFftSize * 2);
      const frequencyData = computeMagnitudeSpectrum(
        buffer,
        t,
        sampleRate,
        spectrumFftSize,
        workBuf
      );
      const bandValues = extractFrequencyBandsOffline(
        frequencyData,
        frequencyBands,
        sampleRate,
        mappingFftSize
      );

      // Stage 1: approximate AnalyserNode smoothingTimeConstant on the extracted band values.
      let analyserSmoothed = this.analyserSmoothedBandValues.get(analyzer.nodeId);
      if (!analyserSmoothed || analyserSmoothed.length !== bandValues.length) {
        analyserSmoothed = bandValues.slice();
        this.analyserSmoothedBandValues.set(analyzer.nodeId, analyserSmoothed);
      }
      for (let i = 0; i < bandValues.length; i++) {
        const s = ANALYSER_SMOOTHING_TIME_CONSTANT;
        analyserSmoothed[i] = s * bandValues[i] + (1 - s) * (analyserSmoothed[i] ?? 0);
      }

      // Stage 2: app per-band smoothing (matches FrequencyAnalyzer smoothing array).
      let smoothed = this.smoothedBandValues.get(analyzer.nodeId);
      if (!smoothed || smoothed.length !== analyserSmoothed.length) {
        smoothed = analyserSmoothed.slice();
        this.smoothedBandValues.set(analyzer.nodeId, smoothed);
      }
      for (let i = 0; i < analyserSmoothed.length; i++) {
        const s = smoothing[i] ?? 0.8;
        smoothed[i] = s * (analyserSmoothed[i] ?? 0) + (1 - s) * (smoothed[i] ?? 0);
      }

      // Push band / band0, band1, ... (smoothed) to match live FrequencyAnalyzer naming
      const bandParamName = (i: number) => (smoothed.length === 1 ? 'band' : `band${i}`);
      for (let i = 0; i < smoothed.length; i++) {
        uniformUpdates.push({
          nodeId: analyzer.nodeId,
          paramName: bandParamName(i),
          value: smoothed[i] ?? 0,
        });
      }

      const remapParamName = (i: number) => (bandRemap.length === 1 ? 'remap' : `remap${i}`);
      for (let i = 0; i < bandRemap.length; i++) {
        const bandValue = smoothed[i] ?? 0;
        const { inMin, inMax, outMin, outMax } = bandRemap[i];
        const range = inMax - inMin;
        const normalized = range !== 0 ? (bandValue - inMin) / range : 0;
        const clamped = Math.max(0, Math.min(1, normalized));
        const remapped = outMin + clamped * (outMax - outMin);
        uniformUpdates.push({
          nodeId: analyzer.nodeId,
          paramName: remapParamName(i),
          value: remapped,
        });
      }
    }

    // Remapper outputs (remap-{id}.out): each remapper takes its band's raw value and remaps
    const bandRawValues = new Map<string, number>();
    for (const analyzer of config.analyzerConfigs) {
      const raw = this.smoothedBandValues.get(analyzer.nodeId)?.[0] ?? 0;
      bandRawValues.set(analyzer.nodeId, raw);
    }
    for (const remap of config.remapperConfigs) {
      const bandRaw = bandRawValues.get(remap.bandId) ?? 0;
      const { inMin, inMax, outMin, outMax } = remap;
      const range = inMax - inMin;
      const normalized = range !== 0 ? (bandRaw - inMin) / range : 0;
      const clamped = Math.max(0, Math.min(1, normalized));
      const remapped = outMin + clamped * (outMax - outMin);
      uniformUpdates.push({
        nodeId: `remap-${remap.id}`,
        paramName: 'out',
        value: remapped,
      });
    }

    return { channelSamples, uniformUpdates, timelineTime: t };
  }
}

// --- Factory: build provider from audioSetup (WP 15B) ---

/**
 * Create OfflineAudioProvider from audioSetup, primary file id, and buffer.
 * Derives band and remapper configs from audioSetup.
 * Only includes bands whose sourceFileId matches the primary file.
 */
export function createOfflineAudioProvider(
  audioSetup: AudioSetup,
  primaryFileId: string,
  buffer: AudioBuffer,
  sampleRate: number,
  frameRate: number,
  startTimeSeconds: number = 0
): OfflineAudioProvider {
  const bandsForPrimary = audioSetup.bands.filter((b) => b.sourceFileId === primaryFileId);

  const analyzerConfigs: AnalyzerConfig[] = bandsForPrimary.map((band) => {
    const fb = band.frequencyBands[0];
    const frequencyBands: Array<{ minHz: number; maxHz: number }> = fb
      ? [{ minHz: Number(fb[0]), maxHz: Number(fb[1]) }]
      : [{ minHz: 20, maxHz: 20000 }];

    const smoothing = band.smoothing ?? 0.8;
    // Underlying spectrum FFT size matches live AnalyserNode.
    const spectrumFftSize = 4096;
    // Hz→bin mapping FFT size mirrors live per-band config (often 2048).
    const mappingFftSize = band.fftSize ?? 2048;

    const bandRemap: Array<{ inMin: number; inMax: number; outMin: number; outMax: number }> = [
      {
        inMin: band.remapInMin ?? 0,
        inMax: band.remapInMax ?? 1,
        outMin: band.remapOutMin ?? 0,
        outMax: band.remapOutMax ?? 1,
      },
    ];

    return {
      nodeId: band.id,
      frequencyBands,
      smoothing: [smoothing],
      spectrumFftSize,
      mappingFftSize,
      bandRemap,
    };
  });

  const remapperConfigs = audioSetup.remappers
    .filter((r) => bandsForPrimary.some((b) => b.id === r.bandId))
    .map((r) => ({
      id: r.id,
      bandId: r.bandId,
      inMin: r.inMin,
      inMax: r.inMax,
      outMin: r.outMin,
      outMax: r.outMax,
    }));

  return new OfflineAudioProvider(buffer, {
    sampleRate,
    frameRate,
    primaryFileId,
    startTimeSeconds,
    analyzerConfigs,
    remapperConfigs,
  });
}
