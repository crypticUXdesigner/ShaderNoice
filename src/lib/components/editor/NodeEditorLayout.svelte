<script lang="ts">
  /**
   * Node Editor Layout - Svelte 5 Migration WP 04A
   * Split view with resizable divider, corner widget, preset dropdown, zoom, help, panel toggle.
   */
  import { Message } from '../ui';
  import { TopBar, KeyboardShortcutsModal } from '../top-bar';
  import { SidePanel } from '../side-panel';
  import VerticalResizeHandle from './VerticalResizeHandle.svelte';
  import PreviewContainer from './PreviewContainer.svelte';
  import ConfirmPresetImportModal from './ConfirmPresetImportModal.svelte';
  import PresetPickerDialog from './PresetPickerDialog.svelte';
  import { portal } from '../../actions/portal';
  import { audioAnalysisStatusStore } from '../../stores/audioAnalysisStatusStore';
  import { getGraph } from '../../stores';
  import { globalErrorHandler } from '../../../utils/errorHandling';
  import type { ViewMode, LayoutCallbacks } from './types';

  interface Props {
    preview?: import('svelte').Snippet<[]>;
    nodeEditor?: import('svelte').Snippet<[]>;
    panel?: import('svelte').Snippet<[]>;
    docsPanel?: import('svelte').Snippet<[]>;
    bottomBar?: import('svelte').Snippet<[string | null]>;
    callbacks?: LayoutCallbacks;
    presetList?: Array<{ name: string; displayName: string }>;
    selectedPreset?: string | null;
    /** Primary track key so bottom bar re-renders when track changes (waveform scrubber). */
    primaryTrackKey?: string | null;
    isPanelVisible?: boolean;
    zoom?: number;
    fps?: number;
    /** When false, top bar disables video export and shows WebCodecs message. */
    isVideoExportSupported?: boolean;
  }

  let {
    preview,
    nodeEditor,
    panel,
    docsPanel,
    bottomBar,
    callbacks = {},
    presetList = [],
    selectedPreset = null,
    primaryTrackKey = null,
    isPanelVisible = true,
    zoom = 1.0,
    fps = 0,
    isVideoExportSupported = true,
  }: Props = $props();

  const SAFE_DISTANCE = 16;
  const PANEL_MIN_WIDTH = 250;
  const PANEL_MAX_WIDTH = 800;

  // State
  let containerEl = $state<HTMLDivElement | undefined>(undefined);
  let buttonContainerEl = $state<HTMLDivElement | undefined>(undefined);
  let presetDialogOpen = $state(false);

  let viewMode = $state<ViewMode>('node');
  let activeTab = $state<'nodes' | 'docs'>('nodes');
  let dividerPosition = $state(0.5);
  let panelWidth = $state(300);
  let isUiHidden = $state(false);

  let isDraggingDivider = $state(false);
  let isResizingPanel = $state(false);
  /** True only after panel open animation (0.3s) has finished; hides instantly when panel starts closing. */
  let showPanelResizeHandle = $state(false);
  let panelOpenTimeoutId = 0;
  let panelResizeStartX = $state(0);
  let panelResizeStartWidth = $state(0);

  /** PERF: Throttle panel/divider/corner resize to one layout update per frame. */
  let resizeMoveRafId = 0;
  let latestMoveEvent = null as MouseEvent | null;

  /** Matches Message flip-out duration so we clear content after non-stacked exit. */
  const MESSAGE_FLIP_OUT_MS = 240;
  /** Keeps stacked layout stable while success slot height eases shut (audio toast moves down smoothly). */
  const TOAST_STACK_SLOT_COLLAPSE_MS = 300;

  let toastVisible = $state(false);
  let toastMessage = $state('');
  let toastVariant = $state<'success' | 'error' | 'info'>('success');
  /** Drives max-height transition on placeholder under the audio toast when success hides. */
  let toastStackSlotCollapsed = $state(false);
  /** True once preset toast hid while audio was visible; keeps collapse slot until message clears even if audio ends mid-animation. */
  let toastExitSlotLatched = $state(false);
  let presetLoading = $state(false);
  let shortcutsModalOpen = $state(false);
  /** When set, show "Import preset?" confirmation modal; confirm runs import with this JSON. */
  let pendingImportJson = $state<string | null>(null);

  // Derived
  const helpEnabled = $derived.by(() => {
    const cb = callbacks.isHelpEnabled;
    if (cb) return cb();
    const g = getGraph();
    const ids = g?.viewState?.selectedNodeIds ?? [];
    return ids.length === 1;
  });

  const fpsColor = $derived(
    fps <= 0 ? 'var(--layout-button-color)' : fps >= 55 ? 'var(--fps-color-good)' : fps >= 30 ? 'var(--fps-color-moderate)' : 'var(--fps-color-poor)'
  );

  const topBarHeight = $derived(isUiHidden ? 0 : (buttonContainerEl ? buttonContainerEl.getBoundingClientRect().height : 60));
  const bottomBarHeight = $derived(isUiHidden ? 0 : 12);
  const bottomSafeInset = $derived(isUiHidden ? 0 : Math.max(bottomBarHeight, SAFE_DISTANCE));
  const rawPanelOffset = $derived(isPanelVisible ? panelWidth : 0);
  const panelOffset = $derived(isUiHidden ? 0 : rawPanelOffset);

  const audioAnalysisToast = $derived.by((): {
    show: boolean;
    variant: 'info' | 'error';
    label: string;
    percent?: number;
  } => {
    const status = $audioAnalysisStatusStore;
    if (status.state === 'building') {
      const label = status.label?.trim() || 'Preparing audio analysis';
      const percent = Math.max(0, Math.min(100, Math.round((status.progress01 ?? 0) * 100)));
      return { show: true, variant: 'info', label, percent };
    }
    if (status.state === 'fallback') {
      const label = status.label?.trim() || 'Audio analysis fallback';
      return { show: true, variant: 'info', label };
    }
    if (status.state === 'failed') {
      const label = status.label?.trim() || 'Audio analysis failed';
      return { show: true, variant: 'error', label };
    }
    return { show: false, variant: 'info', label: '' };
  });

  $effect(() => {
    if (!toastMessage) {
      toastExitSlotLatched = false;
      return;
    }
    if (toastVisible) {
      toastExitSlotLatched = false;
      return;
    }
    if (audioAnalysisToast.show) {
      toastExitSlotLatched = true;
    }
  });

  const showToastStackExitSlot = $derived(
    !!(toastMessage && !toastVisible && (audioAnalysisToast.show || toastExitSlotLatched))
  );

  /** After hide, clear message once exit animation finishes (collapse slot if audio toast is stacked; else flip-out cadence). */
  $effect(() => {
    if (!toastMessage || toastVisible) return;
    const delay = audioAnalysisToast.show ? TOAST_STACK_SLOT_COLLAPSE_MS : MESSAGE_FLIP_OUT_MS;
    const id = window.setTimeout(() => {
      toastMessage = '';
    }, delay);
    return () => window.clearTimeout(id);
  });

  $effect(() => {
    if (!showToastStackExitSlot) {
      toastStackSlotCollapsed = false;
      return;
    }
    toastStackSlotCollapsed = false;
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        toastStackSlotCollapsed = true;
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  });

  // Show toast helper
  function showToast(message: string, type: 'success' | 'error' | 'info') {
    toastMessage = message;
    toastVariant = type;
    toastVisible = true;
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        toastVisible = false;
      }, 3000);
    }
  }

  function isUserCancelled(err: unknown): boolean {
    if (err && typeof err === 'object' && 'name' in err && (err as { name?: unknown }).name === 'AbortError') return true;
    if (err instanceof Error) {
      return err.message === 'Cancelled' || err.message === 'Export cancelled' || err.message === 'Export canceled';
    }
    return false;
  }

  function dismissToast() {
    toastVisible = false;
  }

  // View mode
  function setViewMode(mode: ViewMode) {
    if (viewMode === mode) return;
    viewMode = mode;
  }

  function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.closest?.('[contenteditable="true"]') != null
    );
  }

  // View mode keyboard shortcuts (1/2/3)
  $effect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (shortcutsModalOpen || pendingImportJson !== null) return;
      if (presetDialogOpen) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        callbacks.onPanelToggle?.();
        return;
      }

      if (e.key === '<') {
        e.preventDefault();
        isUiHidden = !isUiHidden;
        presetDialogOpen = false;
        return;
      }

      if (e.key === '1') {
        e.preventDefault();
        setViewMode('node');
      } else if (e.key === '2') {
        e.preventDefault();
        setViewMode('split');
      } else if (e.key === '3') {
        e.preventDefault();
        setViewMode('full');
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Panel resize handle: show only after open animation; hide instantly on close
  $effect(() => {
    const visible = isPanelVisible;
    if (panelOpenTimeoutId) {
      window.clearTimeout(panelOpenTimeoutId);
      panelOpenTimeoutId = 0;
    }
    if (visible) {
      panelOpenTimeoutId = window.setTimeout(() => {
        panelOpenTimeoutId = 0;
        showPanelResizeHandle = true;
      }, 300);
    } else {
      showPanelResizeHandle = false;
    }
    return () => {
      if (panelOpenTimeoutId) window.clearTimeout(panelOpenTimeoutId);
    };
  });

  // Divider drag
  function onDividerMouseDown(e: MouseEvent) {
    isDraggingDivider = true;
    e.preventDefault();
  }

  function onPanelResizeMouseDown(e: MouseEvent) {
    isResizingPanel = true;
    panelResizeStartX = e.clientX;
    panelResizeStartWidth = panelWidth;
    e.preventDefault();
  }

  // Global mouse handlers (throttled to one layout update per frame for FPS during panel/split resize)
  $effect(() => {
    if (!isDraggingDivider && !isResizingPanel) return;

    function applyMove(e: MouseEvent) {
      if (isDraggingDivider && containerEl) {
        const rect = containerEl.getBoundingClientRect();
        const availableWidth = rect.width - panelOffset;
        // Split handle sits to the left of the preview (outside it); handle is at split edge - 4px, so keep it under cursor
        const RESIZE_HANDLE_OFFSET_PX = 4;
        const newPos = (e.clientX - rect.left - panelOffset + RESIZE_HANDLE_OFFSET_PX) / availableWidth;
        dividerPosition = Math.max(0.2, Math.min(0.8, newPos));
      } else if (isResizingPanel) {
        const deltaX = e.clientX - panelResizeStartX;
        panelWidth = Math.max(PANEL_MIN_WIDTH, Math.min(PANEL_MAX_WIDTH, panelResizeStartWidth + deltaX));
      }
    }

    const onMove = (e: MouseEvent) => {
      latestMoveEvent = e;
      if (resizeMoveRafId) return;
      resizeMoveRafId = requestAnimationFrame(() => {
        resizeMoveRafId = 0;
        const ev = latestMoveEvent;
        if (ev) applyMove(ev);
      });
    };

    const onUp = () => {
      if (resizeMoveRafId) {
        cancelAnimationFrame(resizeMoveRafId);
        resizeMoveRafId = 0;
      }
      latestMoveEvent = null;
      isDraggingDivider = false;
      isResizingPanel = false;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      if (resizeMoveRafId) cancelAnimationFrame(resizeMoveRafId);
      resizeMoveRafId = 0;
      latestMoveEvent = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  });

  // Action handlers
  function handleDownloadPreset() {
    try {
      callbacks.onDownloadPreset?.();
      showToast('Graph downloaded as JSON', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to download graph';
      showToast(msg, 'error');
      globalErrorHandler.report('runtime', 'error', 'Failed to download graph', { originalError: err instanceof Error ? err : new Error(msg) });
    }
  }

  async function handleExport() {
    try {
      await callbacks.onExport?.();
      showToast('Image exported successfully!', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to export image';
      showToast(msg, 'error');
      globalErrorHandler.report('runtime', 'error', 'Failed to export image', { originalError: err instanceof Error ? err : new Error(msg) });
    }
  }

  async function handleVideoExport() {
    try {
      const status = $audioAnalysisStatusStore;
      if (status.state === 'building' || status.state === 'fallback') {
        showToast('Live audio is still preparing — export uses deterministic analysis.', 'info');
      }
      await callbacks.onVideoExport?.();
      showToast('Video exported successfully!', 'success');
    } catch (err) {
      if (isUserCancelled(err)) {
        showToast('Video export cancelled', 'info');
        return;
      }
      const msg = err instanceof Error ? err.message : 'Failed to export video';
      showToast(msg, 'error');
      globalErrorHandler.report('runtime', 'error', msg, { originalError: err instanceof Error ? err : new Error(msg) });
    }
  }

  async function handleLoadPreset(presetName: string) {
    presetDialogOpen = false;
    await doLoadPreset(presetName);
  }

  async function doLoadPreset(presetName: string) {
    try {
      presetLoading = true;
      await callbacks.onLoadPreset?.(presetName);
      showToast(`Loaded preset: ${presetName}`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load preset';
      showToast(msg, 'error');
      globalErrorHandler.report('runtime', 'error', 'Failed to load preset', { originalError: err instanceof Error ? err : new Error(msg) });
    } finally {
      presetLoading = false;
    }
  }

  let presetFileInputEl = $state<HTMLInputElement | undefined>(undefined);

  async function handleImportPresetFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !callbacks.onImportPresetFromFile) return;
    const graph = getGraph();
    const json = await file.text();
    if (graph.nodes.length > 0) {
      pendingImportJson = json;
      return;
    }
    await doImportPreset(json);
  }

  async function doImportPreset(json: string) {
    if (!callbacks.onImportPresetFromFile) return;
    try {
      presetLoading = true;
      pendingImportJson = null;
      await callbacks.onImportPresetFromFile(json);
      showToast('Preset imported', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      showToast(msg, 'error');
      globalErrorHandler.report('runtime', 'error', 'Import preset failed', { originalError: err instanceof Error ? err : new Error(msg) });
    } finally {
      presetLoading = false;
    }
  }

  function handlePresetClick(_e: MouseEvent) {
    presetDialogOpen = true;
  }

  let containerWidth = $state(0);
  let containerHeight = $state(0);
  const contentWidth = $derived(containerWidth - panelOffset);

  // ResizeObserver ensures dimensions stay correct when layout changes (e.g. panel toggle, window resize)
  $effect(() => {
    const el = containerEl;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      containerWidth = rect.width;
      containerHeight = rect.height;
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    containerWidth = rect.width;
    containerHeight = rect.height;
    return () => ro.disconnect();
  });

  const topBarZoomChangeProps = $derived.by(() => {
    // Work around occasional Svelte TS stale prop inference by passing this via spread.
    return { onZoomChange: callbacks.onZoomChange } as unknown as Record<string, never>;
  });

  const presetLabel = $derived(
    selectedPreset ? (presetList.find((p) => p.name === selectedPreset)?.displayName ?? selectedPreset) : 'None'
  );

  const zoomPercent = $derived(Math.round(zoom * 100));
</script>

<div
  bind:this={containerEl}
  class="node-editor-layout"
  class:is-resizing-layout={isDraggingDivider || isResizingPanel}
  data-view={viewMode}
  data-preview={viewMode === 'node' ? 'collapsed' : 'expanded'}
  data-ui-hidden={isUiHidden ? 'true' : 'false'}
  style="position: absolute; inset: 0; --panel-width-dynamic: {panelWidth}px; --top-bar-left-offset: {panelOffset}px; --timeline-viewport-left: {panelOffset}px; --timeline-viewport-width: {containerWidth - panelOffset}px;"
>
  <!-- Top bar -->
  <TopBar
    barElement={(el) => (buttonContainerEl = el)}
    presetLabel={presetLabel}
    presetLoading={presetLoading}
    viewMode={viewMode}
    setViewMode={setViewMode}
    zoomPercent={zoomPercent}
    fps={fps}
    fpsColor={fpsColor}
    helpEnabled={helpEnabled}
    isPanelVisible={isPanelVisible}
    panelOffset={panelOffset}
    onPanelToggle={callbacks.onPanelToggle}
    onPresetClick={handlePresetClick}
    onDownloadPreset={handleDownloadPreset}
    onExport={handleExport}
    onVideoExport={handleVideoExport}
    isVideoExportSupported={isVideoExportSupported}
    {...topBarZoomChangeProps}
    onHelpClick={callbacks.onHelpClick}
    onShortcutsClick={() => (shortcutsModalOpen = true)}
  />

  <KeyboardShortcutsModal open={shortcutsModalOpen} onClose={() => (shortcutsModalOpen = false)} />

  <ConfirmPresetImportModal
    open={pendingImportJson !== null}
    onClose={() => (pendingImportJson = null)}
    onConfirm={() => pendingImportJson != null && doImportPreset(pendingImportJson)}
  />

  <PresetPickerDialog
    open={presetDialogOpen}
    presetList={presetList}
    selectedPreset={selectedPreset}
    presetLoading={presetLoading}
    onClose={() => (presetDialogOpen = false)}
    onSelectPreset={(name) => handleLoadPreset(name)}
    onImportFromFile={() => {
      presetDialogOpen = false;
      presetFileInputEl?.click();
    }}
  />

  <input
    type="file"
    accept=".json,application/json"
    style="position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none;"
    bind:this={presetFileInputEl}
    onchange={handleImportPresetFile}
    aria-label="Import preset from file"
  />

  <!-- Side panel (tabs + content slots) -->
  <SidePanel
    isPanelVisible={isPanelVisible}
    panelWidth={panelWidth}
    activeTab={activeTab}
    onTabChange={(tab) => (activeTab = tab)}
    onPanelToggle={() => callbacks.onPanelToggle?.()}
    nodesPanel={panel}
    docsPanel={docsPanel}
  />

  <!-- Resize handles (same level, above slots so they are never clipped by overflow:hidden on editor/preview) -->
  {#if showPanelResizeHandle && !isUiHidden}
    <VerticalResizeHandle
      edgeLeft={panelWidth}
      onMouseDown={onPanelResizeMouseDown}
      disableTransition={isResizingPanel}
    />
  {/if}
  {#if viewMode === 'split' && !isUiHidden}
    <VerticalResizeHandle
      edgeLeft={panelOffset + contentWidth * dividerPosition}
      onMouseDown={onDividerMouseDown}
      disableTransition={isDraggingDivider}
      side="left"
      containerWidth={containerWidth}
    />
  {/if}

  <!-- Node editor slot (z-index below panel so panel draws on top when open; panel uses --z-panel) -->
  <div
    class="node-editor-slot"
    style="
      position: absolute;
      left: {panelOffset}px;
      top: 0;
      bottom: 0;
      overflow: hidden;
      width: {viewMode === 'full' ? 0 : viewMode === 'split' ? contentWidth * dividerPosition : containerWidth - panelOffset}px;
      display: {viewMode === 'full' ? 'none' : 'block'};
      z-index: var(--z-base);
    "
  >
    {#if nodeEditor}
      {@render nodeEditor()}
    {/if}
  </div>

  <!-- Preview slot -->
  <PreviewContainer
    preview={preview}
    viewMode={viewMode}
    panelOffset={panelOffset}
    contentWidth={contentWidth}
    dividerPosition={dividerPosition}
    containerWidth={containerWidth}
    containerHeight={containerHeight}
    topBarHeight={topBarHeight}
    bottomSafeInset={bottomSafeInset}
    containerEl={containerEl}
    disableTransition={isDraggingDivider || isResizingPanel}
  />

  <!-- Bottom bar slot -->
  {#if bottomBar}
    {@render bottomBar(primaryTrackKey)}
  {/if}
</div>

{#if audioAnalysisToast.show || toastMessage}
  <div use:portal class="toast-stack" role="status" aria-live="polite">
    {#if toastMessage}
      {#if toastVisible}
        <Message stacked visible={toastVisible} variant={toastVariant} onclose={dismissToast}>
          <span>{toastMessage}</span>
        </Message>
      {:else if showToastStackExitSlot}
        <div
          class="toast-stack-exit-slot"
          class:is-collapsed={toastStackSlotCollapsed}
          aria-hidden="true"
        ></div>
      {/if}
    {/if}
    {#if audioAnalysisToast.show}
      <Message stacked visible={true} variant={audioAnalysisToast.variant}>
        <span>
          <span>{audioAnalysisToast.label}</span>
          {#if audioAnalysisToast.percent !== undefined}
            <span aria-hidden="true"> {audioAnalysisToast.percent}%</span>
          {/if}
        </span>
      </Message>
    {/if}
  </div>
{/if}

<style>
  /* Stack preset / action toasts with audio analysis (success at bottom, audio above). */
  .toast-stack {
    position: fixed;
    inset: 0;
    z-index: 10000;
    pointer-events: none;
    box-sizing: border-box;
    display: flex;
    flex-direction: column-reverse;
    align-items: center;
    justify-content: flex-start;
    gap: var(--pd-sm);
    padding-bottom: calc(var(--bottom-bar-height) + var(--pd-md));
  }

  .toast-stack-exit-slot {
    width: min(var(--message-max-width), 100%);
    flex-shrink: 0;
    max-height: min(40vh, 12rem);
    overflow: hidden;
    transition: max-height 0.28s cubic-bezier(0.33, 1, 0.68, 1);
    pointer-events: none;
  }

  .toast-stack-exit-slot.is-collapsed {
    max-height: 0;
  }

  /* Panel-affected layout: animate in sync with node panel slide (0.3s ease) */
  .node-editor-layout {
    overflow: visible;

    .node-editor-slot {
      transition: left 0.3s ease, width 0.3s ease;
    }

    /* During divider or panel resize, follow cursor immediately (no transition) */
    &.is-resizing-layout .node-editor-slot {
      transition: none;
    }
  }

  /* Hide all UI chrome (top bar, side panel, bottom bar) but preserve state */
  .node-editor-layout[data-ui-hidden="true"] {
    :global(.top-bar),
    :global(.side-panel-container),
    :global(.bottom-bar-wrapper),
    :global(.vertical-resize-handle) {
      display: none !important;
    }
  }
</style>