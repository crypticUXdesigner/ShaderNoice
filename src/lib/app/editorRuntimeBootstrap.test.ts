/** @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import {
  parseUrlProjectId,
  parseUrlPreviewOverlayEnabled,
  stripProjectQueryFromUrl,
  createEditorPreviewCompileUiSink,
} from './editorRuntimeBootstrap';

describe('editorRuntimeBootstrap URL helpers', () => {
  it('parseUrlProjectId reads ?project=', () => {
    window.history.replaceState(null, '', '/?project=abc-123');
    expect(parseUrlProjectId()).toBe('abc-123');
    window.history.replaceState(null, '', '/');
    expect(parseUrlProjectId()).toBeNull();
  });

  it('parseUrlPreviewOverlayEnabled accepts 1|true|yes', () => {
    window.history.replaceState(null, '', '/?previewOverlay=true');
    expect(parseUrlPreviewOverlayEnabled()).toBe(true);
    window.history.replaceState(null, '', '/?previewOverlay=0');
    expect(parseUrlPreviewOverlayEnabled()).toBe(false);
  });

  it('stripProjectQueryFromUrl removes project param', () => {
    window.history.replaceState(null, '', '/app?project=x&previewOverlay=1');
    stripProjectQueryFromUrl();
    expect(window.location.search).toBe('?previewOverlay=1');
    expect(parseUrlProjectId()).toBeNull();
  });

  it('createEditorPreviewCompileUiSink exposes toast helpers', () => {
    const sink = createEditorPreviewCompileUiSink();
    expect(typeof sink.beginPreviewCompileProgressToast).toBe('function');
    expect(typeof sink.clearPreviewCompileProgressToast).toBe('function');
    expect(typeof sink.previewCompileFailedKeptLastGood).toBe('function');
  });
});
