/**
 * Editor shell wiring for image/video export — lib owns dialogs; packages expose pure run APIs.
 */

import type { NodeGraph } from '../../data-model/types';
import type { AudioSetup } from '../../data-model/audioSetupTypes';
import { getPrimaryFileId } from '../../data-model/audioSetupTypes';
import type { IAudioManager, ShaderCompiler } from '../../runtime/types';
import type { ExportRasterBackend } from '../../runtime/renderBackends/renderBackendTypes';
import {
  createImageExportPreviewController,
  runImageExport,
} from '../../image-export';
import { runVideoExport, isSupported as isVideoExportSupported } from '../../video-export';
import { showImageExportDialog } from './imageExportDialogHost';
import { showVideoExportDialog } from './videoExportDialogHost';

/** Primary-file buffer lookup for video export (explicit deps; no graphStore reads inside). */
export function createGetPrimaryAudioBuffer(deps: {
  getAudioManager: () => IAudioManager | null | undefined;
  getAudioSetup: () => AudioSetup;
}): () => { nodeId: string; buffer: AudioBuffer } | null {
  return () => {
    const audioManager = deps.getAudioManager();
    if (!audioManager) return null;
    const primaryId = getPrimaryFileId(deps.getAudioSetup());
    if (!primaryId) return null;
    const state = audioManager.getAudioNodeState(primaryId);
    if (!state?.audioBuffer) return null;
    return { nodeId: primaryId, buffer: state.audioBuffer };
  };
}

export async function runEditorImageExportSession(deps: {
  compiler: ShaderCompiler | null | undefined;
  graph: NodeGraph;
  audioSetup: AudioSetup;
  getTimelineState: () => { currentTime: number; duration?: number } | null;
  exportRasterBackend: ExportRasterBackend;
}): Promise<void> {
  if (!deps.compiler) return;

  const timelineState = deps.getTimelineState();
  const playheadTimeSeconds = Math.max(0, timelineState?.currentTime ?? 0);
  const durationSeconds = Math.max(0, timelineState?.duration ?? 0);

  const previewController = createImageExportPreviewController(
    deps.graph,
    deps.compiler,
    deps.audioSetup,
    deps.exportRasterBackend
  );

  try {
    const dialog = showImageExportDialog({
      initialTimeSeconds: playheadTimeSeconds,
      durationSeconds,
      renderPreviewFrame: previewController.renderPreviewFrame,
    });
    const config = await dialog.config;

    await runImageExport({
      graph: deps.graph,
      audioSetup: deps.audioSetup,
      compiler: deps.compiler,
      exportRasterBackend: deps.exportRasterBackend,
      config,
      playheadTimeSeconds,
    });

    dialog.close();
  } finally {
    previewController.dispose();
  }
}

export async function runEditorVideoExportSession(deps: {
  graph: NodeGraph;
  audioSetup: AudioSetup;
  compiler: ShaderCompiler;
  getPrimaryAudio: () => { nodeId: string; buffer: AudioBuffer } | null;
  exportRasterBackend: ExportRasterBackend;
}): Promise<void> {
  if (!isVideoExportSupported()) {
    throw new Error('Video export is not supported. WebCodecs (VideoEncoder/AudioEncoder) is required.');
  }

  const dialog = showVideoExportDialog({
    getPrimaryAudio: deps.getPrimaryAudio,
  });
  const config = await dialog.config;

  await runVideoExport({
    graph: deps.graph,
    audioSetup: deps.audioSetup,
    compiler: deps.compiler,
    exportRasterBackend: deps.exportRasterBackend,
    config,
    ui: dialog,
  });
}
