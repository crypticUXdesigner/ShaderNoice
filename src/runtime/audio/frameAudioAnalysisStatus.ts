import type { AudioAnalysisStatus } from '../../lib/stores/audioAnalysisStatusStore';

export const FALLBACK_LIVE_PREVIEW_LABEL = 'Live preview until analysis finishes';

/**
 * Per-frame status chip transition for `AudioManager.updateUniforms`.
 * Returns `null` when the store already holds the desired status (skip write).
 */
export function nextFrameAudioAnalysisStatus(
  current: AudioAnalysisStatus,
  allReady: boolean
): AudioAnalysisStatus | null {
  if (allReady) {
    return current.state === 'ready' ? null : { state: 'ready' };
  }
  if (current.state === 'building') {
    return null;
  }
  if (current.state === 'fallback' && current.label === FALLBACK_LIVE_PREVIEW_LABEL) {
    return null;
  }
  return { state: 'fallback', label: FALLBACK_LIVE_PREVIEW_LABEL };
}
