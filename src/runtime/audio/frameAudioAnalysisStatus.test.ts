import { describe, expect, it } from 'vitest';
import {
  FALLBACK_LIVE_PREVIEW_LABEL,
  nextFrameAudioAnalysisStatus,
} from './frameAudioAnalysisStatus';

describe('nextFrameAudioAnalysisStatus', () => {
  it('skips write when already ready and all curves are ready', () => {
    expect(nextFrameAudioAnalysisStatus({ state: 'ready' }, true)).toBeNull();
  });

  it('emits ready when transitioning from non-ready', () => {
    expect(nextFrameAudioAnalysisStatus({ state: 'fallback', label: FALLBACK_LIVE_PREVIEW_LABEL }, true)).toEqual({
      state: 'ready',
    });
    expect(nextFrameAudioAnalysisStatus({ state: 'idle' }, true)).toEqual({ state: 'ready' });
  });

  it('preserves building without a store write', () => {
    expect(
      nextFrameAudioAnalysisStatus({ state: 'building', progress01: 0.4, label: 'Getting audio ready' }, false)
    ).toBeNull();
  });

  it('skips fallback rewrite when already on the same fallback label', () => {
    expect(
      nextFrameAudioAnalysisStatus({ state: 'fallback', label: FALLBACK_LIVE_PREVIEW_LABEL }, false)
    ).toBeNull();
  });

  it('emits fallback when not ready and not building', () => {
    expect(nextFrameAudioAnalysisStatus({ state: 'idle' }, false)).toEqual({
      state: 'fallback',
      label: FALLBACK_LIVE_PREVIEW_LABEL,
    });
    expect(nextFrameAudioAnalysisStatus({ state: 'ready' }, false)).toEqual({
      state: 'fallback',
      label: FALLBACK_LIVE_PREVIEW_LABEL,
    });
  });
});
