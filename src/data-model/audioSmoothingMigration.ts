import type { AudioSetup } from './audioSetupTypes';

const REFERENCE_FPS = 120;
const DEFAULT_HALF_LIFE_SECONDS = 1 / REFERENCE_FPS;

/**
 * Ensure time-based smoothing fields exist for bands.
 * - If smoothingHalfLifeSeconds is missing, set a deterministic default (120 Hz reference cadence).
 */
export function ensureBandSmoothingHalfLife(audioSetup: AudioSetup): AudioSetup {
  if (!audioSetup.bands || audioSetup.bands.length === 0) return audioSetup;

  let changed = false;
  const bands = audioSetup.bands.map((b) => {
    if (b.smoothingHalfLifeSeconds != null) return b;
    changed = true;
    return { ...b, smoothingHalfLifeSeconds: DEFAULT_HALF_LIFE_SECONDS };
  });

  return changed ? { ...audioSetup, bands } : audioSetup;
}

