import { describe, expect, it } from 'vitest';
import { OfflineAudioProvider } from './OfflineAudioProvider';

function makeMockAudioBuffer(options: {
  sampleRate: number;
  numberOfChannels: number;
  length: number;
}): AudioBuffer {
  const { sampleRate, numberOfChannels, length } = options;
  const channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));

  // Provide deterministic, non-silent content (helps catch accidental zeroing).
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const data = channels[ch];
    for (let i = 0; i < data.length; i++) data[i] = ((i % 97) / 97) * (ch === 0 ? 1 : 0.5);
  }

  const duration = length / sampleRate;
  return {
    sampleRate,
    numberOfChannels,
    length,
    duration,
    getChannelData(ch: number) {
      return channels[ch] ?? new Float32Array(0);
    },
  } as unknown as AudioBuffer;
}

describe('OfflineAudioProvider', () => {
  it('slices per-frame audio with sample-accurate rounding (avoids drift)', () => {
    const sampleRate = 44_100;
    const frameRate = 120; // 44100 / 120 = 367.5 -> requires alternating frame lengths
    const seconds = 1;
    const buffer = makeMockAudioBuffer({
      sampleRate,
      numberOfChannels: 2,
      length: sampleRate * seconds,
    });

    const provider = new OfflineAudioProvider(buffer, {
      sampleRate,
      frameRate,
      primaryFileId: 'file-1',
      analyzerConfigs: [],
      remapperConfigs: [],
    });

    const frameCount = frameRate * seconds;
    let total = 0;
    let prevEnd = 0;

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
      const start = Math.round(frameIndex * sampleRate / frameRate);
      const end = Math.round((frameIndex + 1) * sampleRate / frameRate);
      const expectedLen = end - start;

      // Bounds should be contiguous (no gaps / overlaps).
      expect(start).toBe(prevEnd);
      prevEnd = end;

      const state = provider.getFrameState(frameIndex);
      expect(state.channelSamples.length).toBe(2);
      expect(state.channelSamples[0]!.length).toBe(expectedLen);
      expect(state.channelSamples[1]!.length).toBe(expectedLen);

      total += expectedLen;
    }

    expect(total).toBe(sampleRate * seconds);
    expect(prevEnd).toBe(sampleRate * seconds);
  });
});

