/**
 * Video Export Orchestrator & UI
 *
 * Dialog for resolution, duration, full-audio option, bitrate; progress + cancel;
 * offline loop using OfflineAudioProvider (01), ExportRenderPath (02B), WebCodecsVideoExporter (02A);
 * file save.
 */

import { mount, unmount } from 'svelte';
import type { NodeGraph } from '../data-model/types';
import type { AudioSetup } from '../data-model/audioSetupTypes';
import { getPrimaryFileId } from '../data-model/audioSetupTypes';
import type { ShaderCompiler } from '../runtime/types';
import { createOfflineAudioProvider } from './OfflineAudioProvider';
import { createHighFidelityOfflineAudioProvider } from './HighFidelityOfflineAudioProvider';
import { createExportRenderPath } from './ExportRenderPath';
import { WebCodecsVideoExporter, isSupported } from './WebCodecsVideoExporter';
import type { FrameAudioState } from './OfflineAudioProvider';
import {
  MAX_EXPORT_FRAMES,
  MAX_EXPORT_WIDTH,
  MAX_EXPORT_HEIGHT,
  formatExportLimitError,
} from './exportLimits';
import { writable } from 'svelte/store';
import VideoExportDialog from '../lib/components/export/VideoExportDialog.svelte';
import VideoExportProgressOverlay from '../lib/components/export/VideoExportProgressOverlay.svelte';

export interface VideoExportOrchestratorOptions {
  graph: NodeGraph;
  audioSetup: AudioSetup;
  compiler: ShaderCompiler;
  /** Returns the primary file (from audioSetup) with loaded buffer, or null. */
  getPrimaryAudio: () => { nodeId: string; buffer: AudioBuffer } | null;
}

export interface VideoExportDialogConfig {
  width: number;
  height: number;
  maxDurationSeconds: number;
  useFullAudio: boolean;
  /** Start time (seconds) relative to the primary track. */
  startSeconds?: number;
  /** End time (seconds) relative to the primary track. */
  endSeconds?: number;
  /** When true and no audio is loaded, allow export as video-only (no audio track). */
  allowVideoOnly: boolean;
  /** When true, use high-fidelity (slower) audio analysis to better match preview. */
  highFidelityAudio: boolean;
  videoBitrate?: number;
  audioBitrate?: number;
  frameRate: number;
}

/** 192 kbps AAC – high quality, within typical browser encoder support (256 kbps often unsupported) */
const DEFAULT_AUDIO_BITRATE = 192_000;
/** Default video bitrate in Mbps (shown in UI); stored as bps when passing to exporter */
const DEFAULT_VIDEO_BITRATE_MBPS = 10;
const DEFAULT_VIDEO_BITRATE = DEFAULT_VIDEO_BITRATE_MBPS * 1_000_000;

/** Config from dialog: audio optional (no buffer = video-only export when allowVideoOnly is true). */
export type VideoExportResolvedConfig = VideoExportDialogConfig & {
  primaryNodeId?: string;
  buffer?: AudioBuffer;
  audioDurationSeconds?: number;
};

/**
 * Show modal dialog to collect export config. Resolves with config on Confirm, rejects on Cancel.
 * Uses VideoExportDialog.svelte (mounted imperatively).
 */
function showExportDialog(options: VideoExportOrchestratorOptions): Promise<VideoExportResolvedConfig> {
  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let settled = false;
    let instance: ReturnType<typeof mount> | null = null;

    const cleanup = () => {
      if (!container.parentNode) return;
      if (instance) unmount(instance);
      container.remove();
    };

    const handleClose = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Cancelled'));
    };

    const handleConfirm = (config: VideoExportResolvedConfig) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(config);
    };

    instance = mount(VideoExportDialog, {
      target: container,
      props: {
        visible: true,
        getPrimaryAudio: options.getPrimaryAudio,
        onClose: handleClose,
        onConfirm: handleConfirm,
      },
    });
  });
}

/**
 * Show progress modal with "Frame N / M", a "keep in focus" hint, and Cancel button.
 * Uses VideoExportProgressOverlay.svelte.
 */
function showProgressOverlay(): {
  setProgress: (current: number, total: number) => void;
  cancel: () => void;
  closed: Promise<void>;
} {
  let resolveClosed: () => void;
  const closed = new Promise<void>((r) => {
    resolveClosed = r;
  });

  const progressStore = writable({ current: 0, total: 0 });
  const container = document.createElement('div');
  document.body.appendChild(container);
  let instance: ReturnType<typeof mount> | null = null;

  const handleCancel = () => {
    if (instance) unmount(instance);
    container.remove();
    resolveClosed();
  };

  instance = mount(VideoExportProgressOverlay, {
    target: container,
    props: {
      progress: progressStore,
      onCancel: handleCancel,
    },
  });

  return {
    setProgress(current: number, total: number) {
      progressStore.set({ current, total });
    },
    cancel() {
      handleCancel();
    },
    closed,
  };
}

/**
 * Trigger download of binary data as a file.
 */
function downloadBlob(data: Uint8Array, filename: string): void {
  const blob = new Blob([data as unknown as BlobPart], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate a sensible filename for the exported video.
 */
function defaultFilename(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `shader-export-${y}-${m}-${d}-${h}${min}.mp4`;
}

/**
 * Run the full video export flow: dialog → progress → offline loop → save.
 * Throws if WebCodecs not supported or user cancels. Audio is optional (video-only when no primary audio).
 */
export async function runVideoExportFlow(options: VideoExportOrchestratorOptions): Promise<void> {
  if (!isSupported()) {
    throw new Error('Video export is not supported in this browser. WebCodecs (VideoEncoder/AudioEncoder) is required.');
  }

  const config = await showExportDialog(options);
  const { graph, audioSetup, compiler } = options;
  const { width, height, maxDurationSeconds, frameRate } = config;

  const hasAudio = config.buffer != null;
  if (!hasAudio && !config.allowVideoOnly) {
    throw new Error('No audio loaded. Load a track first, or explicitly enable "Export without audio" in the dialog.');
  }

  // Audio is required unless user explicitly opted into video-only export.
  const buffer: AudioBuffer | null = config.buffer ?? null;
  const primaryNodeId: string = config.primaryNodeId ?? getPrimaryFileId(audioSetup) ?? 'export-no-audio';
  const sampleRate = buffer?.sampleRate ?? 48_000;
  const numberOfChannels = hasAudio ? buffer!.numberOfChannels : 0;
  const startSeconds = hasAudio ? Math.max(0, config.startSeconds ?? 0) : 0;
  const endSeconds = hasAudio ? Math.max(startSeconds, config.endSeconds ?? startSeconds + maxDurationSeconds) : maxDurationSeconds;

  const effectiveDurationSeconds = Math.max(0.01, endSeconds - startSeconds);
  const maxFrames = Math.max(1, Math.floor(effectiveDurationSeconds * frameRate));

  if (width < 1 || width > MAX_EXPORT_WIDTH) {
    throw new Error(
      formatExportLimitError({
        limitName: 'width (px)',
        limitValue: MAX_EXPORT_WIDTH,
        actualValue: width,
        hint: `Use width between 1 and ${MAX_EXPORT_WIDTH}.`,
      })
    );
  }
  if (height < 1 || height > MAX_EXPORT_HEIGHT) {
    throw new Error(
      formatExportLimitError({
        limitName: 'height (px)',
        limitValue: MAX_EXPORT_HEIGHT,
        actualValue: height,
        hint: `Use height between 1 and ${MAX_EXPORT_HEIGHT}.`,
      })
    );
  }
  if (maxFrames > MAX_EXPORT_FRAMES) {
    throw new Error(
      formatExportLimitError({
        limitName: 'frame count',
        limitValue: MAX_EXPORT_FRAMES,
        actualValue: maxFrames,
        hint: 'Shorten duration or lower frame rate.',
      })
    );
  }

  const progress = showProgressOverlay();
  let cancelled = false;
  progress.closed.then(() => {
    cancelled = true;
  });

  const offlineProvider = hasAudio
    ? (config.highFidelityAudio
        ? await createHighFidelityOfflineAudioProvider(audioSetup, primaryNodeId, buffer!, sampleRate, frameRate, startSeconds)
        : createOfflineAudioProvider(audioSetup, primaryNodeId, buffer!, sampleRate, frameRate, startSeconds))
    : null;

  const renderPath = createExportRenderPath(graph, compiler, audioSetup, {
    width,
    height,
    frameRate,
    startTimeSeconds: startSeconds,
  });

  const slicedAudioBuffer = hasAudio && buffer ? sliceAudioBuffer(buffer, startSeconds, endSeconds) : undefined;
  const exporter = WebCodecsVideoExporter.create({
    width,
    height,
    frameRate,
    sampleRate,
    numberOfChannels,
    audioBuffer: slicedAudioBuffer,
    videoBitrate: config.videoBitrate ?? DEFAULT_VIDEO_BITRATE,
    audioBitrate: config.audioBitrate ?? DEFAULT_AUDIO_BITRATE,
  });

  try {
    const yieldEvery = Math.max(1, Math.round(frameRate / 30)); // ~30 yields/sec at common FPS
    for (let frameIndex = 0; frameIndex < maxFrames; frameIndex++) {
      if (cancelled) {
        exporter.terminate();
        break;
      }
      progress.setProgress(frameIndex + 1, maxFrames);

      const frameState: FrameAudioState = offlineProvider
        ? offlineProvider.getFrameState(frameIndex)
        : { channelSamples: [], uniformUpdates: [], timelineTime: frameIndex / frameRate };
      const canvas = renderPath.renderFrame(frameIndex, frameState);
      const timestampSeconds = frameIndex / frameRate;
      // Audio is encoded as a full track up-front; per-frame channel samples are still computed
      // for offline analysis + uniform updates.
      await exporter.addFrame(canvas, frameState.channelSamples, timestampSeconds);

      // Yield to UI so progress and cancel are responsive
      if (frameIndex % yieldEvery === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    if (cancelled) {
      throw new Error('Export cancelled');
    }

    const data = await exporter.finalize();
    progress.cancel();
    renderPath.dispose();
    downloadBlob(data, defaultFilename());
  } catch (err) {
    exporter.terminate();
    progress.cancel();
    renderPath.dispose();
    throw err;
  }
}

function sliceAudioBuffer(buffer: AudioBuffer, startSeconds: number, endSeconds: number): AudioBuffer {
  const sampleRate = buffer.sampleRate;
  const startSample = Math.max(0, Math.min(buffer.length, Math.round(startSeconds * sampleRate)));
  const endSample = Math.max(startSample, Math.min(buffer.length, Math.round(endSeconds * sampleRate)));
  const length = Math.max(1, endSample - startSample);
  const out = new AudioBuffer({
    length,
    numberOfChannels: buffer.numberOfChannels,
    sampleRate,
  });
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch).subarray(startSample, endSample);
    out.getChannelData(ch).set(src);
  }
  return out;
}
