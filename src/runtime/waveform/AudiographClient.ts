/**
 * Client for AudioTool audiograph API (GetAudiographs).
 * Fetches RMS-normalized uint32[] per resource name; caches by (resource_name, resolution, channels).
 * Normalizes values to 0–1 for drawing.
 *
 * Uses protobuf-generated RPC from @audiotool/nexus (Connect + JSON against rpc.audiotool.com).
 * Headers: Content-Type handled by Connect; optional Authorization: Bearer <VITE_AUDIOTOOL_API_TOKEN>.
 * Track ID must be a valid Audiotool track/sample resource name (e.g. tracks/xyz).
 */

import {
  AudiographService,
  GetAudiographChannels,
  GetAudiographResolution,
  GetAudiographsResponse,
} from '@audiotool/nexus/api';
import { Code, ConnectError, createClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';

import type { AudiographChannels, AudiographResolution } from './types';

/** Resolution for scrubber/timeline (reference: 120). */
export const SCRUBBER_RESOLUTION: AudiographResolution = 120;
const DEFAULT_RESOLUTION: AudiographResolution = SCRUBBER_RESOLUTION;
const DEFAULT_CHANNELS: AudiographChannels = 1;

/** Uint32 max for normalizing audiograph values to 0–1. */
const UINT32_MAX = 0xffff_ffff;

/** Default base URL for Audiograph RPC (override with VITE_AUDIOGRAPH_API_URL). */
const DEFAULT_AUDIOGRAPH_BASE_URL = 'https://rpc.audiotool.com';

const RESOLUTION_TO_PROTO: Record<AudiographResolution, GetAudiographResolution> = {
  120: GetAudiographResolution.GET_AUDIOGRAPH_RESOLUTION_120,
  240: GetAudiographResolution.GET_AUDIOGRAPH_RESOLUTION_240,
  480: GetAudiographResolution.GET_AUDIOGRAPH_RESOLUTION_480,
  960: GetAudiographResolution.GET_AUDIOGRAPH_RESOLUTION_960,
  1920: GetAudiographResolution.GET_AUDIOGRAPH_RESOLUTION_1920,
  3840: GetAudiographResolution.GET_AUDIOGRAPH_RESOLUTION_3840,
};

function getAudiographBaseUrl(): string {
  try {
    const env = (import.meta as { env?: { VITE_AUDIOGRAPH_API_URL?: string } }).env;
    const fromEnv = (env?.VITE_AUDIOGRAPH_API_URL as string)?.trim();
    return fromEnv && fromEnv !== '' ? fromEnv : DEFAULT_AUDIOGRAPH_BASE_URL;
  } catch {
    return DEFAULT_AUDIOGRAPH_BASE_URL;
  }
}

/** Optional Bearer token for rpc.audiotool.com (VITE_AUDIOTOOL_API_TOKEN). */
function getApiToken(): string {
  try {
    const env = (import.meta as { env?: { VITE_AUDIOTOOL_API_TOKEN?: string } }).env;
    return (env?.VITE_AUDIOTOOL_API_TOKEN as string)?.trim() ?? '';
  } catch {
    return '';
  }
}

function toProtoResolution(resolution: AudiographResolution): GetAudiographResolution {
  return RESOLUTION_TO_PROTO[resolution] ?? GetAudiographResolution.GET_AUDIOGRAPH_RESOLUTION_UNSPECIFIED;
}

function toProtoChannels(channels: AudiographChannels): GetAudiographChannels {
  return channels === 2 ? GetAudiographChannels.STEREO : GetAudiographChannels.MONO;
}

/**
 * Parse a single value from API (number or string).
 * Values already in 0–1 are kept; otherwise treat as integer (uint16 or uint32) and normalize to 0–1.
 * We use UINT32_MAX so values are in 0–1; caller then peak-normalizes so API scale (e.g. 0–65535) doesn't matter.
 */
function parseValue(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) {
    if (v >= 0 && v <= 1) return v;
    return Math.max(0, Math.min(1, v / UINT32_MAX));
  }
  const n = typeof v === 'string' ? Number(v) : Number.NaN;
  if (!Number.isFinite(n)) return 0;
  if (n >= 0 && n <= 1) return n;
  return Math.max(0, Math.min(1, n / UINT32_MAX));
}

/** Peak-normalize array to 0–1 range so waveform is visible regardless of API scale (uint16 vs uint32). */
function peakNormalize(values: number[]): void {
  if (values.length === 0) return;
  const max = Math.max(...values);
  if (max <= 0) return;
  for (let i = 0; i < values.length; i++) {
    values[i] /= max;
  }
}

/** True when audiograph routes are gone (matches prior 404 disable behavior). */
function shouldDisableClient(err: ConnectError): boolean {
  return err.code === Code.NotFound || err.code === Code.Unimplemented;
}

type MonoCacheEntry = { values: number[]; fetchedAt: number };
type StereoCacheEntry = { left: number[]; right: number[]; fetchedAt: number };

export class AudiographClient {
  private cache = new Map<string, MonoCacheEntry>();
  private stereoCache = new Map<string, StereoCacheEntry>();
  private monoInFlight = new Map<string, Promise<number[] | null>>();
  private stereoInFlight = new Map<string, Promise<{ left: number[]; right: number[] } | null>>();
  private readonly baseUrl: string;
  private readonly cacheTtlMs: number;
  /** Connect client for audiograph RPC (pinned proto via @audiotool/nexus). */
  private readonly rpcClient: ReturnType<typeof createClient<typeof AudiographService>>;
  private lastErrorLogged: string | null = null;
  private disabled = false;

  constructor(options?: { baseUrl?: string; cacheTtlMs?: number }) {
    this.baseUrl = options?.baseUrl ?? getAudiographBaseUrl();
    this.cacheTtlMs = options?.cacheTtlMs ?? 300_000; // 5 min

    const transport = createConnectTransport({
      baseUrl: this.baseUrl.replace(/\/$/, ''),
      interceptors: [
        (next) => async (req) => {
          const token = getApiToken();
          if (token) req.header.set('Authorization', `Bearer ${token}`);
          return next(req);
        },
      ],
    });

    this.rpcClient = createClient(AudiographService, transport);
  }

  private cacheKey(resourceName: string, resolution: AudiographResolution, channels: AudiographChannels): string {
    return `${resourceName}|${resolution}|${channels}`;
  }

  /**
   * Fetch audiograph for a resource (e.g. track id). Returns values normalized to 0–1.
   * On failure returns null; logs error once per distinct message.
   */
  async getAudiograph(
    resourceName: string,
    resolution: AudiographResolution = DEFAULT_RESOLUTION,
    channels: AudiographChannels = DEFAULT_CHANNELS
  ): Promise<number[] | null> {
    if (!this.baseUrl || this.disabled) return null;

    const key = this.cacheKey(resourceName, resolution, channels);
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      return cached.values;
    }
    const inFlight = this.monoInFlight.get(key);
    if (inFlight) return inFlight;

    const promise = this.fetchMono(resourceName, resolution, channels, key);
    this.monoInFlight.set(key, promise);
    promise.finally(() => this.monoInFlight.delete(key));
    return promise;
  }

  private async fetchMono(
    resourceName: string,
    resolution: AudiographResolution,
    channels: AudiographChannels,
    key: string
  ): Promise<number[] | null> {
    try {
      const res = await this.rpcClient.getAudiographs({
        resourceNames: [resourceName],
        resolution: toProtoResolution(resolution),
        channels: toProtoChannels(channels),
      });

      const ag = res.audiographs[0];
      const graphs = ag?.graphs;
      const raw = Array.isArray(graphs) ? graphs[0]?.values : undefined;
      if (!Array.isArray(raw) || raw.length === 0) {
        this.logEmptyAudiograph(resourceName, res, 'mono');
        return null;
      }
      const values = raw.map((v) => parseValue(v));
      peakNormalize(values);
      this.cache.set(key, { values, fetchedAt: Date.now() });
      this.lastErrorLogged = null;
      return values;
    } catch (err) {
      if (err instanceof ConnectError && shouldDisableClient(err)) this.disabled = true;
      const msg = err instanceof Error ? err.message : String(err);
      this.logErrorOnce(`Audiograph fetch failed: ${msg}`);
      return null;
    }
  }

  /**
   * Fetch stereo audiograph (left and right channels). Returns values normalized to 0–1.
   * Used for mini timeline bar display: up = left, down = right.
   */
  async getAudiographStereo(
    resourceName: string,
    resolution: AudiographResolution = DEFAULT_RESOLUTION
  ): Promise<{ left: number[]; right: number[] } | null> {
    if (!this.baseUrl || this.disabled) return null;

    const key = this.cacheKey(resourceName, resolution, 2);
    const cached = this.stereoCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      return { left: cached.left, right: cached.right };
    }
    const inFlight = this.stereoInFlight.get(key);
    if (inFlight) return inFlight;

    const promise = this.fetchStereo(resourceName, resolution, key);
    this.stereoInFlight.set(key, promise);
    promise.finally(() => this.stereoInFlight.delete(key));
    return promise;
  }

  private async fetchStereo(
    resourceName: string,
    resolution: AudiographResolution,
    key: string
  ): Promise<{ left: number[]; right: number[] } | null> {
    try {
      const data = await this.rpcClient.getAudiographs({
        resourceNames: [resourceName],
        resolution: toProtoResolution(resolution),
        channels: GetAudiographChannels.STEREO,
      });

      const ag = data.audiographs[0];
      const graphs = ag?.graphs ?? [];
      const rawLeft = Array.isArray(graphs[0]?.values) ? graphs[0].values : undefined;
      const rawRight = Array.isArray(graphs[1]?.values) ? graphs[1].values : undefined;
      if (!Array.isArray(rawLeft) || rawLeft.length === 0) {
        this.logEmptyAudiograph(resourceName, data, 'stereo');
        return null;
      }
      const left = rawLeft.map((v) => parseValue(v));
      const right =
        Array.isArray(rawRight) && rawRight.length === rawLeft.length
          ? rawRight.map((v) => parseValue(v))
          : left.slice();
      const maxLeft = left.length ? Math.max(...left) : 0;
      const maxRight = right.length ? Math.max(...right) : 0;
      const maxValue = Math.max(maxLeft, maxRight);
      if (maxValue > 0) {
        for (let i = 0; i < left.length; i++) {
          left[i] /= maxValue;
        }
        for (let i = 0; i < right.length; i++) {
          right[i] /= maxValue;
        }
      }
      this.stereoCache.set(key, { left, right, fetchedAt: Date.now() });
      this.lastErrorLogged = null;
      return { left, right };
    } catch (err) {
      if (err instanceof ConnectError && shouldDisableClient(err)) this.disabled = true;
      const msg = err instanceof Error ? err.message : String(err);
      this.logErrorOnce(`Audiograph stereo fetch failed: ${msg}`);
      return null;
    }
  }

  private logErrorOnce(_message: string): void {
    if (this.lastErrorLogged === _message) return;
    this.lastErrorLogged = _message;
  }

  private logEmptyAudiograph(
    _resourceName: string,
    _data: GetAudiographsResponse,
    _kind: 'mono' | 'stereo'
  ): void {
    // No logging; kept for call-site compatibility.
  }

  /** Invalidate cache for a resource (e.g. when primary changes). */
  invalidate(resourceName: string, resolution?: AudiographResolution, channels?: AudiographChannels): void {
    const prefix = `${resourceName}|`;
    if (resolution !== undefined && channels !== undefined) {
      const key = this.cacheKey(resourceName, resolution, channels);
      this.cache.delete(key);
      this.monoInFlight.delete(key);
      this.stereoCache.delete(this.cacheKey(resourceName, resolution, 2));
      this.stereoInFlight.delete(this.cacheKey(resourceName, resolution, 2));
    } else {
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) this.cache.delete(key), this.monoInFlight.delete(key);
      }
      for (const key of this.stereoCache.keys()) {
        if (key.startsWith(prefix)) this.stereoCache.delete(key), this.stereoInFlight.delete(key);
      }
    }
  }

  /** Clear entire cache (e.g. on primary change when caller doesn't know resource). */
  clearCache(): void {
    this.cache.clear();
    this.stereoCache.clear();
    this.monoInFlight.clear();
    this.stereoInFlight.clear();
  }
}
