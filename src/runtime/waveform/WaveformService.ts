/**
 * WaveformService - unified waveform data for current primary source (02B).
 * For playlist tracks: audiograph API (with buffer fallback on failure).
 * For uploads: buffer-derived waveform only.
 * Exposes getWaveformForPrimary() and getWaveformSlice() for 03A/03B/03C.
 */

import type { PrimarySource } from '../../data-model/audioSetupTypes';
import type { WaveformData } from './types';
import { AudiographClient, SCRUBBER_RESOLUTION } from './AudiographClient';
import { computeWaveformFromBuffer, DEFAULT_WAVEFORM_LENGTH } from './bufferWaveform';
import { getTrackDurationSeconds, getTracksData, resolvePlaylistTrackMp3Url } from '../tracksData';

/** Normalize playlist trackId to API resource name (e.g. tracks/123). */
function toAudiographResourceName(trackId: string): string {
  return trackId.startsWith('tracks/') ? trackId : `tracks/${trackId}`;
}

export interface WaveformServiceDeps {
  /** Current primary source (from audioSetup.primarySource). */
  getPrimarySource: () => PrimarySource | undefined;
  /** Primary file id (playlist trackId or upload file id). */
  getPrimaryFileId: () => string | undefined;
  /** Current primary AudioBuffer when loaded (e.g. from audioManager.getAudioNodeState(id)?.audioBuffer). */
  getPrimaryBuffer: () => AudioBuffer | null;
  /** Optional: resolve track duration in seconds for playlist track when buffer not yet loaded. Defaults to getTrackDurationSeconds. */
  getTrackDurationSeconds?: (trackId: string) => Promise<number | undefined>;
}

const EMPTY_WAVEFORM: WaveformData = { values: [], durationSeconds: 0, source: 'buffer' };

/**
 * Returns waveform values for the time range [startTime, endTime] as a slice of the full values.
 * Same 0–1 normalized format. If full values are empty, returns [].
 */
export function getWaveformSlice(
  fullValues: number[],
  durationSeconds: number,
  startTime: number,
  endTime: number
): number[] {
  if (fullValues.length === 0 || durationSeconds <= 0 || startTime >= endTime) return [];
  const start = Math.max(0, startTime);
  const end = Math.min(durationSeconds, endTime);
  const startIdx = Math.floor((start / durationSeconds) * fullValues.length);
  const endIdx = Math.ceil((end / durationSeconds) * fullValues.length);
  return fullValues.slice(startIdx, endIdx);
}

export class WaveformService {
  private deps: WaveformServiceDeps;
  private audiographClient: AudiographClient;
  private lastPrimaryId: string | undefined = undefined;
  private trackWaveformCache = new Map<string, WaveformData>();
  private trackWaveformInFlight = new Map<string, Promise<WaveformData>>();
  private decodeCtx: OfflineAudioContext | null = null;

  constructor(deps: WaveformServiceDeps, audiographClient?: AudiographClient) {
    this.deps = deps;
    this.audiographClient = audiographClient ?? new AudiographClient();
  }

  /**
   * Stable key identifying the current primary audio source.
   * Intended for UI layers to subscribe to primary changes without knowing internals.
   */
  getPrimaryWaveformKey(): string {
    const primary = this.deps.getPrimarySource();
    const primaryId = this.deps.getPrimaryFileId();
    if (!primary || !primaryId) return '';
    return `${primary.type}:${primaryId}`;
  }

  private getDecodeContext(): OfflineAudioContext {
    // OfflineAudioContext can decode without a user gesture and is safe for background work.
    if (this.decodeCtx) return this.decodeCtx;
    this.decodeCtx = new OfflineAudioContext(1, 1, 44100);
    return this.decodeCtx;
  }

  private async getWaveformFromTrackMp3(trackId: string): Promise<WaveformData> {
    const cached = this.trackWaveformCache.get(trackId);
    if (cached) return cached;
    const inFlight = this.trackWaveformInFlight.get(trackId);
    if (inFlight) return inFlight;

    const promise = (async () => {
      try {
        const data = await getTracksData();
        const mp3Url = resolvePlaylistTrackMp3Url(data, toAudiographResourceName(trackId));
        if (!mp3Url) return EMPTY_WAVEFORM;

        const res = await fetch(mp3Url);
        if (!res.ok) return EMPTY_WAVEFORM;
        const arrayBuffer = await res.arrayBuffer();

        const ctx = this.getDecodeContext();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
        const { values, durationSeconds } = computeWaveformFromBuffer(audioBuffer, DEFAULT_WAVEFORM_LENGTH);

        const waveform: WaveformData = {
          values,
          valuesRight: values.slice(),
          durationSeconds,
          source: 'buffer',
        };
        this.trackWaveformCache.set(trackId, waveform);
        return waveform;
      } catch {
        return EMPTY_WAVEFORM;
      }
    })();

    this.trackWaveformInFlight.set(trackId, promise);
    promise.finally(() => this.trackWaveformInFlight.delete(trackId));
    return promise;
  }

  /**
   * Get waveform for the current primary source.
   * Playlist: fetch audiograph (or from cache); on failure fall back to buffer if loaded.
   * Upload: buffer-derived only.
   * Returns empty WaveformData on no primary or when no data available (no crash).
   */
  async getWaveformForPrimary(): Promise<WaveformData> {
    const primary = this.deps.getPrimarySource();
    const primaryId = this.deps.getPrimaryFileId();
    const buffer = this.deps.getPrimaryBuffer();

    if (!primary || !primaryId) {
      return EMPTY_WAVEFORM;
    }

    // Invalidate audiograph cache when primary changes
    if (this.lastPrimaryId != null && this.lastPrimaryId !== primaryId) {
      this.audiographClient.clearCache();
    }
    this.lastPrimaryId = primaryId;

    if (primary.type === 'upload') {
      if (!buffer) return EMPTY_WAVEFORM;
      const { values, durationSeconds } = computeWaveformFromBuffer(buffer, DEFAULT_WAVEFORM_LENGTH);
      return { values, durationSeconds, source: 'buffer' };
    }

    // Playlist: stereo audiograph (reference); shared L/R scale. Fallback to buffer if empty/zeros.
    const resourceName = toAudiographResourceName(primary.trackId);
    const stereo = await this.audiographClient.getAudiographStereo(resourceName, SCRUBBER_RESOLUTION);
    const left = stereo?.left ?? [];
    const right = stereo?.right ?? [];
    const maxL = left.length ? Math.max(...left) : 0;
    const hasUsefulAudiograph = left.length > 0 && maxL > 0;

    if (hasUsefulAudiograph) {
      const durationSeconds =
        buffer?.duration ??
        (await (this.deps.getTrackDurationSeconds ?? getTrackDurationSeconds)?.(primary.trackId)) ??
        0;
      return {
        values: left,
        valuesRight: right.length === left.length ? right : left,
        durationSeconds,
        source: 'audiograph',
      };
    }

    // Fallback: buffer-derived when we have the buffer (e.g. track already loaded for playback).
    // Used when audiograph is missing, empty, or all zeros so we still show a real waveform.
    if (buffer) {
      const { values, durationSeconds } = computeWaveformFromBuffer(buffer, DEFAULT_WAVEFORM_LENGTH);
      return { values, durationSeconds, source: 'buffer' };
    }

    // Last resort for playlist: fetch MP3 and derive waveform client-side (avoids relying on Audiograph RPC).
    // This is cached per track id to prevent repeated decoding work.
    return await this.getWaveformFromTrackMp3(primary.trackId);
  }

  /**
   * Return a slice of waveform values for the given time window (for timeline/curve editor).
   * Call after getWaveformForPrimary(); uses the same full values + duration.
   */
  getWaveformSlice(
    fullValues: number[],
    durationSeconds: number,
    startTime: number,
    endTime: number
  ): number[] {
    return getWaveformSlice(fullValues, durationSeconds, startTime, endTime);
  }
}
