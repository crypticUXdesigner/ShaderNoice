/**
 * Imperative mount host for ImageExportDialog (lib owns Svelte surface).
 */

import { mount, unmount } from 'svelte';
import ImageExportDialog from '../components/export/ImageExportDialog.svelte';
import type { ImageExportConfirmPayload } from '../../image-export/types';
import type { ImageExportPreviewRenderFn } from '../../image-export/imageExportOrchestrator';

export interface ShowImageExportDialogOptions {
  initialTimeSeconds: number;
  durationSeconds: number;
  renderPreviewFrame: ImageExportPreviewRenderFn;
}

export function showImageExportDialog(opts: ShowImageExportDialogOptions): {
  config: Promise<ImageExportConfirmPayload>;
  close: () => void;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);

  let instance: ReturnType<typeof mount> | null = null;
  let settled = false;

  const cleanup = () => {
    if (!container.parentNode) return;
    if (instance) unmount(instance);
    container.remove();
  };

  let resolveConfig!: (cfg: ImageExportConfirmPayload) => void;
  let rejectConfig!: (err: Error) => void;
  const config = new Promise<ImageExportConfirmPayload>((resolve, reject) => {
    resolveConfig = resolve;
    rejectConfig = reject;
  });

  const handleClose = () => {
    if (settled) return;
    settled = true;
    cleanup();
    rejectConfig(new Error('Cancelled'));
  };

  const handleConfirm = (cfg: ImageExportConfirmPayload) => {
    if (settled) return;
    settled = true;
    cleanup();
    resolveConfig(cfg);
  };

  instance = mount(ImageExportDialog, {
    target: container,
    props: {
      visible: true,
      initialTimeSeconds: opts.initialTimeSeconds,
      durationSeconds: opts.durationSeconds,
      renderPreviewFrame: opts.renderPreviewFrame,
      onClose: handleClose,
      onConfirm: handleConfirm,
    },
  });

  return {
    config,
    close() {
      cleanup();
    },
  };
}
