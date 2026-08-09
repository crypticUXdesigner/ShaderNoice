import { describe, it, expect } from 'vitest';
import {
  isConservativeStaticPreviewDependencyMask,
  parseWebGpuPreviewDependencyClockMaskFromSearch,
  resolveWebGpuPreviewDependencyMaskForClock,
} from './webGpuPreviewDependencyClock';
import type { PreviewDependencyMask } from '../compile-contract';

function mask(partial: Partial<PreviewDependencyMask>): PreviewDependencyMask {
  return {
    usesWallTime: false,
    usesTimelineTime: false,
    usesAudioUniforms: false,
    usesRadialPulseVirtualDrive: false,
    usesRadialPulseSpawnUniformPass: false,
    usesResolutionUniform: false,
    usesMouseUniforms: false,
    usesFrameIndex: false,
    ...partial,
  };
}

/**
 * Mirrors `TimeManager.updateTime` deps: usesWallTime, usesTimelineTime, usesFrameIndex,
 * usesRadialPulseSpawnUniformPass, usesAudioUniforms. Nested blocks map resolver
 * acceptance (same mask vs null) to those fields.
 */
describe('isConservativeStaticPreviewDependencyMask', () => {
  it('is true only when every clock/audio/spawn/frame driver is off and no primary audio', () => {
    expect(isConservativeStaticPreviewDependencyMask(mask({}), false)).toBe(true);
    expect(
      isConservativeStaticPreviewDependencyMask(mask({ usesResolutionUniform: true, usesMouseUniforms: true }), false)
    ).toBe(true);
  });

  it('rejects wall, timeline, audio, spawn, virtual drive, frame, or primary audio', () => {
    expect(isConservativeStaticPreviewDependencyMask(mask({ usesWallTime: true }), false)).toBe(false);
    expect(isConservativeStaticPreviewDependencyMask(mask({ usesTimelineTime: true }), false)).toBe(false);
    expect(isConservativeStaticPreviewDependencyMask(mask({ usesAudioUniforms: true }), false)).toBe(false);
    expect(isConservativeStaticPreviewDependencyMask(mask({ usesRadialPulseVirtualDrive: true }), false)).toBe(
      false
    );
    expect(
      isConservativeStaticPreviewDependencyMask(mask({ usesRadialPulseSpawnUniformPass: true }), false)
    ).toBe(false);
    expect(isConservativeStaticPreviewDependencyMask(mask({ usesFrameIndex: true }), false)).toBe(false);
    expect(isConservativeStaticPreviewDependencyMask(mask({}), true)).toBe(false);
  });
});

describe('resolveWebGpuPreviewDependencyMaskForClock', () => {
  it('returns null when mask is null (flag on or off)', () => {
    expect(resolveWebGpuPreviewDependencyMaskForClock(false, null, false)).toBeNull();
    expect(resolveWebGpuPreviewDependencyMaskForClock(true, null, false)).toBeNull();
  });

  describe('policy A — conservative static subset (flag off)', () => {
    it('accepts proven-static mask without experimental flag', () => {
      const m = mask({});
      expect(resolveWebGpuPreviewDependencyMaskForClock(false, m, false)).toBe(m);
    });

    it('accepts static mask that only needs resolution/mouse (not clock drivers)', () => {
      const m = mask({ usesResolutionUniform: true, usesMouseUniforms: true });
      expect(resolveWebGpuPreviewDependencyMaskForClock(false, m, false)).toBe(m);
    });

    it('fail-opens (null) for wall-driven mask when flag is off', () => {
      const m = mask({ usesWallTime: true });
      expect(resolveWebGpuPreviewDependencyMaskForClock(false, m, false)).toBeNull();
    });

    it('fail-opens for timeline-driven mask when flag is off', () => {
      const m = mask({ usesTimelineTime: true });
      expect(resolveWebGpuPreviewDependencyMaskForClock(false, m, false)).toBeNull();
    });

    it('fail-opens for audio/spawn/frame/primary without flag', () => {
      expect(
        resolveWebGpuPreviewDependencyMaskForClock(false, mask({ usesAudioUniforms: true }), false)
      ).toBeNull();
      expect(
        resolveWebGpuPreviewDependencyMaskForClock(
          false,
          mask({ usesRadialPulseSpawnUniformPass: true }),
          false
        )
      ).toBeNull();
      expect(
        resolveWebGpuPreviewDependencyMaskForClock(false, mask({ usesRadialPulseVirtualDrive: true }), false)
      ).toBeNull();
      expect(resolveWebGpuPreviewDependencyMaskForClock(false, mask({ usesFrameIndex: true }), false)).toBeNull();
      expect(resolveWebGpuPreviewDependencyMaskForClock(false, mask({}), true)).toBeNull();
    });
  });

  describe('usesWallTime (experimental flag — TimeManager wall/timeline driver)', () => {
    it('accepts mask when wall time drives clock (flag on)', () => {
      const m = mask({ usesWallTime: true, usesAudioUniforms: true });
      expect(resolveWebGpuPreviewDependencyMaskForClock(true, m, false)).toBe(m);
    });

    it('accepts mask when wall time drives clock even if primary audio is present', () => {
      const m = mask({ usesWallTime: true, usesTimelineTime: false });
      expect(resolveWebGpuPreviewDependencyMaskForClock(true, m, true)).toBe(m);
    });
  });

  describe('usesTimelineTime (experimental flag)', () => {
    it('accepts mask when only timeline drives clock', () => {
      const m = mask({ usesWallTime: false, usesTimelineTime: true });
      expect(resolveWebGpuPreviewDependencyMaskForClock(true, m, false)).toBe(m);
    });

    it('accepts mask when timeline drives clock even if audio uniforms would otherwise force fail-open', () => {
      const m = mask({
        usesWallTime: false,
        usesTimelineTime: true,
        usesAudioUniforms: true,
      });
      expect(resolveWebGpuPreviewDependencyMaskForClock(true, m, false)).toBe(m);
    });
  });

  describe('usesAudioUniforms (experimental fail-open)', () => {
    it('fail-opens (null) when audio uniforms without wall or timeline clock', () => {
      const m = mask({ usesAudioUniforms: true, usesWallTime: false, usesTimelineTime: false });
      expect(resolveWebGpuPreviewDependencyMaskForClock(true, m, false)).toBeNull();
    });

    it('accepts mask when audio uniforms and wall clock both set', () => {
      const m = mask({ usesAudioUniforms: true, usesWallTime: true, usesTimelineTime: false });
      expect(resolveWebGpuPreviewDependencyMaskForClock(true, m, false)).toBe(m);
    });
  });

  describe('usesRadialPulseSpawnUniformPass / virtual drive (experimental fail-open)', () => {
    it('fail-opens when radial spawn pass without wall or timeline clock', () => {
      const m = mask({ usesRadialPulseSpawnUniformPass: true, usesWallTime: false, usesTimelineTime: false });
      expect(resolveWebGpuPreviewDependencyMaskForClock(true, m, false)).toBeNull();
    });

    it('fail-opens when virtual drive alone without wall or timeline clock', () => {
      const m = mask({ usesRadialPulseVirtualDrive: true, usesWallTime: false, usesTimelineTime: false });
      expect(resolveWebGpuPreviewDependencyMaskForClock(true, m, false)).toBeNull();
    });

    it('accepts mask when radial spawn pass and wall clock both set', () => {
      const m = mask({
        usesWallTime: true,
        usesRadialPulseSpawnUniformPass: true,
        usesTimelineTime: false,
      });
      expect(resolveWebGpuPreviewDependencyMaskForClock(true, m, false)).toBe(m);
    });
  });

  describe('usesFrameIndex (experimental fail-open)', () => {
    it('fail-opens when frame index without wall or timeline clock', () => {
      const m = mask({ usesFrameIndex: true, usesWallTime: false, usesTimelineTime: false });
      expect(resolveWebGpuPreviewDependencyMaskForClock(true, m, false)).toBeNull();
    });

    it('accepts mask when frame index and wall clock both set', () => {
      const m = mask({ usesWallTime: true, usesFrameIndex: true, usesTimelineTime: false });
      expect(resolveWebGpuPreviewDependencyMaskForClock(true, m, false)).toBe(m);
    });
  });

  describe('audioPrimaryPresent (conservative; mask may omit usesAudioUniforms)', () => {
    it('fail-opens when primary audio present without wall or timeline clock (flag on)', () => {
      const m = mask({ usesWallTime: false, usesTimelineTime: false, usesAudioUniforms: false });
      expect(resolveWebGpuPreviewDependencyMaskForClock(true, m, true)).toBeNull();
    });

    it('allows static mask when nothing risky and no primary audio (flag on)', () => {
      const m = mask({ usesWallTime: false, usesTimelineTime: false });
      expect(resolveWebGpuPreviewDependencyMaskForClock(true, m, false)).toBe(m);
    });
  });
});

describe('parseWebGpuPreviewDependencyClockMaskFromSearch', () => {
  it('parses affirmative query values', () => {
    expect(parseWebGpuPreviewDependencyClockMaskFromSearch('?webgpuPreviewDependencyClock=1')).toBe(true);
    expect(parseWebGpuPreviewDependencyClockMaskFromSearch('?webgpuPreviewDependencyClock=true')).toBe(true);
    expect(parseWebGpuPreviewDependencyClockMaskFromSearch('?webgpuPreviewDependencyClock=yes')).toBe(true);
  });

  it('defaults to false', () => {
    expect(parseWebGpuPreviewDependencyClockMaskFromSearch('')).toBe(false);
    expect(parseWebGpuPreviewDependencyClockMaskFromSearch('?webgpuPreviewDependencyClock=0')).toBe(false);
    expect(parseWebGpuPreviewDependencyClockMaskFromSearch('?other=1')).toBe(false);
  });
});
