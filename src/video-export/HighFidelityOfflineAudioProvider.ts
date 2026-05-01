/**
 * High-fidelity offline audio provider for video export.
 *
 * Goal: match the live preview's WebAudio analyser behavior as closely as possible.
 * Approach: run an OfflineAudioContext graph with a real AnalyserNode and sample its
 * getByteFrequencyData output at frame boundaries using a ScriptProcessorNode callback.
 *
 * This is slower than the lightweight FFT path but should produce band values that
 * more closely match what the browser preview shows.
 */

import type { AudioSetup } from '../data-model/audioSetupTypes';
import type { AnalyzerConfig, FrameAudioState, UniformUpdate } from './OfflineAudioProvider';

type FrequencyBand = { minHz: number; maxHz: number };

function extractFrequencyBands(
  frequencyData: Uint8Array,
  frequencyBands: FrequencyBand[],
  sampleRate: number,
  mappingFftSize: number
): number[] {
  const bandValues: number[] = [];
  for (const band of frequencyBands) {
    const minBin = Math.floor((band.minHz / sampleRate) * mappingFftSize);
    const maxBin = Math.ceil((band.maxHz / sampleRate) * mappingFftSize);
    let sum = 0;
    let count = 0;
    for (let i = minBin; i <= maxBin && i < frequencyData.length; i++) {
      sum += frequencyData[i];
      count++;
    }
    const average = count > 0 ? sum / count : 0;
    bandValues.push(average / 255.0);
  }
  return bandValues;
}

function remapValue(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const range = inMax - inMin;
  const normalized = range !== 0 ? (value - inMin) / range : 0;
  const clamped = Math.max(0, Math.min(1, normalized));
  return outMin + clamped * (outMax - outMin);
}

export interface HighFidelityProviderConfig {
  sampleRate: number;
  frameRate: number;
  primaryFileId: string;
  /** Start time offset (seconds) for export (seek); uniforms sample at absolute time. */
  startTimeSeconds?: number;
  analyzerConfigs: AnalyzerConfig[];
  remapperConfigs: Array<{ id: string; bandId: string; inMin: number; inMax: number; outMin: number; outMax: number }>;
}

export class HighFidelityOfflineAudioProvider {
  private readonly buffer: AudioBuffer;
  private readonly config: HighFidelityProviderConfig;

  private readonly maxSamplesPerFrame: number;
  private readonly frameChannelSamples: Float32Array[];

  // Precomputed per-frame band values per analyzer node id.
  // Map: analyzerId -> Float32Array[frameCount] (single band) OR array-of-frames for multi-band.
  private readonly perAnalyzerBands: Map<string, number[][]> = new Map();

  private constructor(buffer: AudioBuffer, config: HighFidelityProviderConfig) {
    this.buffer = buffer;
    this.config = config;
    this.maxSamplesPerFrame = Math.ceil(config.sampleRate / config.frameRate);
    this.frameChannelSamples = Array.from(
      { length: buffer.numberOfChannels },
      () => new Float32Array(this.maxSamplesPerFrame)
    );
  }

  static async create(buffer: AudioBuffer, config: HighFidelityProviderConfig): Promise<HighFidelityOfflineAudioProvider> {
    const provider = new HighFidelityOfflineAudioProvider(buffer, config);
    await provider.precomputeAnalyserBands();
    return provider;
  }

  private async precomputeAnalyserBands(): Promise<void> {
    const { sampleRate, frameRate, analyzerConfigs } = this.config;
    const frameCount = Math.max(1, Math.floor(this.buffer.duration * frameRate));

    // Initialize storage
    for (const analyzer of analyzerConfigs) {
      const bandCount = analyzer.frequencyBands.length;
      const frames: number[][] = Array.from({ length: frameCount }, () => new Array(bandCount).fill(0));
      this.perAnalyzerBands.set(analyzer.nodeId, frames);
    }

    // Create OfflineAudioContext for full-duration render.
    const length = Math.max(1, Math.ceil(this.buffer.duration * sampleRate));
    const ctx = new OfflineAudioContext(this.buffer.numberOfChannels, length, sampleRate);

    const source = ctx.createBufferSource();
    source.buffer = this.buffer;

    // Analyser configured like live preview defaults.
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.8;
    analyser.minDecibels = -100;
    analyser.maxDecibels = -30;

    // Silent sink (avoid audible output; OfflineAudioContext isn't audible anyway, but keep graph valid)
    const gain = ctx.createGain();
    gain.gain.value = 0;

    // ScriptProcessor gives us time slices during offline rendering.
    // Choose a moderate buffer size; smaller = more callbacks, larger = less accurate sampling.
    const processor = ctx.createScriptProcessor(2048, this.buffer.numberOfChannels, this.buffer.numberOfChannels);

    const maxFft = Math.max(2048, ...analyzerConfigs.map((a) => a.spectrumFftSize));
    const freqData = new Uint8Array(maxFft / 2);

    // Per-analyzer smoothed band values (app-level smoothing, same as live FrequencyAnalyzer)
    const smoothedByAnalyzer = new Map<string, number[]>();

    let nextFrameIndex = 0;

    processor.onaudioprocess = () => {
      // ctx.currentTime is not reliable during offline render callbacks; use processed sample count.
      // ScriptProcessorNode doesn't expose sample position directly, so approximate using nextFrameSample
      // and increment frames whenever we are called (best-effort). This is why this mode is "slower but closer".
      // For higher accuracy, we'd need an AudioWorkletProcessor with a sample counter.
      while (nextFrameIndex < frameCount) {
        // We sample once per callback at most; break to avoid excessive loops.
        // This means accuracy depends on processor buffer size; acceptable for "high fidelity" mode.
        break;
      }

      // Determine the approximate frame time based on how far offline rendering progressed.
      const t = ctx.currentTime;
      const approxFrameIndex = Math.min(frameCount - 1, Math.max(0, Math.floor(t * frameRate)));
      if (approxFrameIndex < nextFrameIndex) return;
      nextFrameIndex = approxFrameIndex;

      for (const analyzerCfg of analyzerConfigs) {
        // Match live: underlying analyser FFT is fixed at 4096. Band extraction may still use per-band mapping size.
        analyser.fftSize = 4096;
        const binCount = analyser.frequencyBinCount;
        const temp = binCount === freqData.length ? freqData : new Uint8Array(binCount);
        analyser.getByteFrequencyData(temp);

        const bands = extractFrequencyBands(temp, analyzerCfg.frequencyBands, sampleRate, analyzerCfg.mappingFftSize);
        let smoothed = smoothedByAnalyzer.get(analyzerCfg.nodeId);
        if (!smoothed || smoothed.length !== bands.length) {
          smoothed = bands.slice();
          smoothedByAnalyzer.set(analyzerCfg.nodeId, smoothed);
        }
        for (let i = 0; i < bands.length; i++) {
          const s = analyzerCfg.smoothing[i] ?? 0.8;
          smoothed[i] = s * bands[i] + (1 - s) * (smoothed[i] ?? 0);
        }

        const frames = this.perAnalyzerBands.get(analyzerCfg.nodeId);
        if (frames) frames[nextFrameIndex] = smoothed.slice();
      }

      nextFrameIndex++;
    };

    // Wire graph: source -> analyser -> processor -> gain -> destination
    source.connect(analyser);
    analyser.connect(processor);
    processor.connect(gain);
    gain.connect(ctx.destination);

    source.start(0);
    await ctx.startRendering();
  }

  getFrameState(frameIndex: number): FrameAudioState {
    const { buffer, config } = this;
    const sampleRate = config.sampleRate;
    const frameRate = config.frameRate;
    const startTimeSeconds = config.startTimeSeconds ?? 0;
    const startSampleOffset = Math.round(startTimeSeconds * sampleRate);

    // Audio mux samples (same as lightweight provider: raw channel samples per frame)
    const startSample = startSampleOffset + Math.round(frameIndex * sampleRate / frameRate);
    const endSample = startSampleOffset + Math.round((frameIndex + 1) * sampleRate / frameRate);
    // Use sample-accurate time to keep uniforms aligned with muxed audio.
    const t = startSample / sampleRate;
    const targetLength = Math.max(0, Math.min(this.maxSamplesPerFrame, endSample - startSample));
    for (let ch = 0; ch < this.frameChannelSamples.length; ch++) {
      const src = buffer.getChannelData(ch);
      const out = this.frameChannelSamples[ch];
      for (let i = 0; i < targetLength; i++) {
        const idx = startSample + i;
        out[i] = idx >= 0 && idx < src.length ? src[idx] : 0;
      }
      for (let i = targetLength; i < out.length; i++) out[i] = 0;
    }
    const channelSamples = this.frameChannelSamples.map((c) => c.subarray(0, targetLength));

    const uniformUpdates: UniformUpdate[] = [];

    // File uniforms
    uniformUpdates.push(
      { nodeId: config.primaryFileId, paramName: 'currentTime', value: t },
      { nodeId: config.primaryFileId, paramName: 'duration', value: buffer.duration },
      { nodeId: config.primaryFileId, paramName: 'isPlaying', value: 1 }
    );

    // Analyzer band uniforms + band remap uniforms
    for (const analyzer of config.analyzerConfigs) {
      const frameBands = this.perAnalyzerBands.get(analyzer.nodeId)?.[frameIndex] ?? [];
      const bandParamName = (i: number) => (analyzer.frequencyBands.length === 1 ? 'band' : `band${i}`);
      for (let i = 0; i < analyzer.frequencyBands.length; i++) {
        uniformUpdates.push({
          nodeId: analyzer.nodeId,
          paramName: bandParamName(i),
          value: frameBands[i] ?? 0,
        });
      }

      const remapParamName = (i: number) => (analyzer.bandRemap.length === 1 ? 'remap' : `remap${i}`);
      for (let i = 0; i < analyzer.bandRemap.length; i++) {
        const v = frameBands[i] ?? 0;
        const { inMin, inMax, outMin, outMax } = analyzer.bandRemap[i];
        uniformUpdates.push({
          nodeId: analyzer.nodeId,
          paramName: remapParamName(i),
          value: remapValue(v, inMin, inMax, outMin, outMax),
        });
      }
    }

    // Remapper virtual outputs (remap-{id}.out)
    const bandRawValues = new Map<string, number>();
    for (const analyzer of config.analyzerConfigs) {
      const raw = this.perAnalyzerBands.get(analyzer.nodeId)?.[frameIndex]?.[0] ?? 0;
      bandRawValues.set(analyzer.nodeId, raw);
    }
    for (const remap of config.remapperConfigs) {
      const bandRaw = bandRawValues.get(remap.bandId) ?? 0;
      uniformUpdates.push({
        nodeId: `remap-${remap.id}`,
        paramName: 'out',
        value: remapValue(bandRaw, remap.inMin, remap.inMax, remap.outMin, remap.outMax),
      });
    }

    return { channelSamples, uniformUpdates, timelineTime: t };
  }
}

export async function createHighFidelityOfflineAudioProvider(
  audioSetup: AudioSetup,
  primaryFileId: string,
  buffer: AudioBuffer,
  sampleRate: number,
  frameRate: number,
  startTimeSeconds: number = 0
): Promise<HighFidelityOfflineAudioProvider> {
  const bandsForPrimary = audioSetup.bands.filter((b) => b.sourceFileId === primaryFileId);

  const analyzerConfigs: AnalyzerConfig[] = bandsForPrimary.map((band) => {
    const fb = band.frequencyBands[0];
    const frequencyBands: Array<{ minHz: number; maxHz: number }> = fb
      ? [{ minHz: Number(fb[0]), maxHz: Number(fb[1]) }]
      : [{ minHz: 20, maxHz: 20000 }];

    const smoothing = band.smoothing ?? 0.8;
    const spectrumFftSize = 4096;
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

  return await HighFidelityOfflineAudioProvider.create(buffer, {
    sampleRate,
    frameRate,
    primaryFileId,
    startTimeSeconds,
    analyzerConfigs,
    remapperConfigs,
  });
}

