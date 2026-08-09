import type { PreviewDependencyMask } from '../compile-contract';

/**
 * Opt-in URL flag: `?webgpuPreviewDependencyClock=1|true|yes`
 * Enables the **broader** WebGPU clock path: pass any internally consistent
 * {@link PreviewDependencyMask} into {@link TimeManager} (including wall/timeline-driven
 * graphs) so paused audio-reactive previews can use capped cadence.
 *
 * **Default (flag off)** still applies a **conservative static subset** when the mask proves
 * there are no wall/timeline/audio/spawn/frame drivers (and no primary audio file) — safe
 * idle throttling without trusting incomplete WGSL motion inference for animated graphs.
 *
 * When uncertain, callers pass `null` (full-rate). See false-negative catalog in module docs below.
 *
 * ## False-negative risk catalog (missed motion → stuck preview)
 *
 * | Risk | Mitigation |
 * | --- | --- |
 * | WGSL MVP regex/reachability misses `uTime` / globals | `mergeWebGpuPreviewDependencyMask` OR-forces wall for pass plans + audio uniforms; WGSL MVP ORs primary transport into wall |
 * | Primary audio present but uniforms absent from snapshot | `audioPrimaryPresent` gate rejects static subset / fail-opens experimental non-clock path |
 * | Radial-pulse virtual Drive / free-run spawn without wall | Mask sets `usesRadialPulseSpawnUniformPass` (+ virtual drive); resolver fail-opens without clock drivers |
 * | Frame-index node without wall | `usesFrameIndex` fail-opens without clock drivers |
 * | Audio uniforms without wall/timeline | Fail-open unless experimental path has `drivesClock` |
 *
 * Prefer full-rate (`null`) over a wrong static accept.
 */

/** Query values that enable the broader experimental WebGPU clock mask. */
export function parseUrlWebGpuPreviewDependencyClockMask(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = new URLSearchParams(window.location.search).get('webgpuPreviewDependencyClock')?.trim().toLowerCase();
    return raw === '1' || raw === 'true' || raw === 'yes';
  } catch {
    return false;
  }
}

/** @internal Vitest — parse from a query string without `window`. */
export function parseWebGpuPreviewDependencyClockMaskFromSearch(search: string): boolean {
  const raw = new URLSearchParams(search).get('webgpuPreviewDependencyClock')?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

/**
 * Proven-idle mask: no wall/timeline clock, no audio/spawn/frame drivers, no primary audio file.
 * Safe to apply on WebGPU **without** the experimental URL flag (policy A).
 */
export function isConservativeStaticPreviewDependencyMask(
  mask: PreviewDependencyMask,
  audioPrimaryPresent: boolean
): boolean {
  if (audioPrimaryPresent) return false;
  return (
    !mask.usesWallTime &&
    !mask.usesTimelineTime &&
    !mask.usesAudioUniforms &&
    !mask.usesRadialPulseVirtualDrive &&
    !mask.usesRadialPulseSpawnUniformPass &&
    !mask.usesFrameIndex
  );
}

/**
 * Resolve which mask (if any) WebGPU preview may pass into {@link TimeManager}.
 *
 * - **Always:** conservative static subset → return mask (idle throttle).
 * - **Experimental flag on:** also accept masks where wall/timeline drives the clock;
 *   fail-open to `null` for ambiguous non-clock motion (audio/spawn/frame/primary).
 * - **Otherwise:** `null` = legacy full-rate.
 */
export function resolveWebGpuPreviewDependencyMaskForClock(
  experimentalMaskEnabled: boolean,
  mask: PreviewDependencyMask | null,
  audioPrimaryPresent: boolean
): PreviewDependencyMask | null {
  if (mask == null) return null;

  // Policy A: always-safe idle subset (no URL flag required).
  if (isConservativeStaticPreviewDependencyMask(mask, audioPrimaryPresent)) {
    return mask;
  }

  if (!experimentalMaskEnabled) return null;

  const drivesClock = mask.usesWallTime || mask.usesTimelineTime;

  if (!drivesClock) {
    // Ambiguous motion without a declared clock driver — fail-open (full-rate).
    if (mask.usesAudioUniforms) return null;
    if (mask.usesRadialPulseVirtualDrive) return null;
    if (mask.usesRadialPulseSpawnUniformPass) return null;
    if (mask.usesFrameIndex) return null;
    if (audioPrimaryPresent) return null;
  }

  return mask;
}
