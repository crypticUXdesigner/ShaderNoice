/**
 * Imperative mount host for VideoExportDialog (lib owns Svelte surface + progress stores).
 */

import { mount, unmount } from 'svelte';
import { writable } from 'svelte/store';
import VideoExportDialog from '../components/export/VideoExportDialog.svelte';
import type { VideoExportResolvedConfig, VideoExportUiSession } from '../../video-export/videoExportOrchestrator';

export interface ShowVideoExportDialogOptions {
  getPrimaryAudio: () => { nodeId: string; buffer: AudioBuffer } | null;
}

export type VideoExportDialogHost = VideoExportUiSession & {
  config: Promise<VideoExportResolvedConfig>;
  requestCancel: () => void;
};

/**
 * Show modal dialog to collect export config. Resolves with config on Confirm, rejects on Cancel.
 * After confirm, the dialog stays open and swaps to progress view.
 */
export function showVideoExportDialog(options: ShowVideoExportDialogOptions): VideoExportDialogHost {
  const progressStore = writable({ current: 0, total: 0 });
  const destinationReadyStore = writable(false);
  const container = document.createElement('div');
  document.body.appendChild(container);

  let instance: ReturnType<typeof mount> | null = null;
  let settled = false;

  let resolveCancelled: () => void;
  const cancelled = new Promise<void>((r) => {
    resolveCancelled = r;
  });
  let cancelRequested = false;

  const cleanup = () => {
    if (!container.parentNode) return;
    if (instance) unmount(instance);
    container.remove();
  };

  let resolveConfig!: (config: VideoExportResolvedConfig) => void;
  let rejectConfig!: (err: Error) => void;
  const config = new Promise<VideoExportResolvedConfig>((resolve, reject) => {
    resolveConfig = resolve;
    rejectConfig = reject;
  });

  const handleClose = () => {
    if (settled) return;
    settled = true;
    cleanup();
    rejectConfig(new Error('Cancelled'));
  };

  const handleConfirm = (cfg: VideoExportResolvedConfig) => {
    if (settled) return;
    settled = true;
    // Important: do NOT cleanup here. The dialog stays open and switches to progress step.
    resolveConfig(cfg);
  };

  const handleCancelExport = () => {
    if (cancelRequested) return;
    cancelRequested = true;
    resolveCancelled();
  };

  instance = mount(VideoExportDialog, {
    target: container,
    props: {
      visible: true,
      getPrimaryAudio: options.getPrimaryAudio,
      onClose: handleClose,
      onConfirm: handleConfirm,
      progress: progressStore,
      destinationReady: destinationReadyStore,
      onCancelExport: handleCancelExport,
    },
  });

  return {
    config,
    setProgress(current: number, total: number) {
      progressStore.set({ current, total });
    },
    setDestinationReady(ready: boolean) {
      destinationReadyStore.set(ready);
    },
    requestCancel() {
      handleCancelExport();
    },
    close() {
      cleanup();
    },
    cancelled,
  };
}
