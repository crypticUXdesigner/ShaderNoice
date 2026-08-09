import { describe, it, expect } from 'vitest';
import {
  GENERIC_RAYMARCHER_WEBGPU_MVP_SDF_TYPES,
  genericRaymarcherWebGpuMvpSdfAllowedListSentence,
} from './genericRaymarcherWebGpuMvpAllowlist';
import {
  GENERIC_RAYMARCHER_WEBGPU_MVP_SDF_TYPES as fromBarrel,
  genericRaymarcherWebGpuMvpSdfAllowedListSentence as sentenceFromBarrel,
} from './index';

describe('genericRaymarcherWebGpuMvpAllowlist (platform-validation)', () => {
  it('keeps a non-empty SDF allowlist with known pilot types', () => {
    expect(GENERIC_RAYMARCHER_WEBGPU_MVP_SDF_TYPES.size).toBeGreaterThan(0);
    expect(GENERIC_RAYMARCHER_WEBGPU_MVP_SDF_TYPES.has('mandelbulb-sdf')).toBe(true);
    expect(GENERIC_RAYMARCHER_WEBGPU_MVP_SDF_TYPES.has('glass-shell')).toBe(false);
  });

  it('barrel re-exports the same Set instance and sentence helper', () => {
    expect(fromBarrel).toBe(GENERIC_RAYMARCHER_WEBGPU_MVP_SDF_TYPES);
    expect(sentenceFromBarrel()).toBe(genericRaymarcherWebGpuMvpSdfAllowedListSentence());
  });
});
