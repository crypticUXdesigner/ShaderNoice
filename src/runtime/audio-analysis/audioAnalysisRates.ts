/**
 * Offline FFT / analysis hop rates.
 *
 * Export keeps a dense canonical grid so video-frame sampling stays stable.
 * Live preview (worker curve builds) uses a cheaper hop so long clips become
 * UI-ready faster; both paths store `hopSeconds` on the curve cache and
 * interpolate identically at sample time.
 *
 * Intentional fidelity delta: preview vs export band uniforms may differ
 * slightly between hops (smoothing steps accumulate on a coarser grid).
 * Same-hop builds remain bit-aligned (see audioAnalysisRates.test.ts).
 */

/** Canonical analysis rate for OfflineAudioProvider / video export. */
export const EXPORT_ANALYSIS_RATE_HZ = 120;

/** Live preview / AudioManager worker builds (full + Tier B/CD). */
export const PREVIEW_ANALYSIS_RATE_HZ = 60;

export const EXPORT_ANALYSIS_HOP_SECONDS = 1 / EXPORT_ANALYSIS_RATE_HZ;
export const PREVIEW_ANALYSIS_HOP_SECONDS = 1 / PREVIEW_ANALYSIS_RATE_HZ;

/** ~2 s of audio between progressive partial cache publishes (live builds). */
export function analysisPartialPublishEveryFrames(hopHz: number): number {
  return Math.max(1, Math.round(hopHz * 2));
}

/** Derive hop Hz from a cache; falls back to preview rate if missing/invalid. */
export function hopHzFromCacheHopSeconds(hopSeconds: number): number {
  if (!(hopSeconds > 0) || !Number.isFinite(hopSeconds)) return PREVIEW_ANALYSIS_RATE_HZ;
  return 1 / hopSeconds;
}
