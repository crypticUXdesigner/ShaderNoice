<script lang="ts">
  import { Modal, Button, Input, RangeSlider, Tag, IconSvg } from '../ui';
  import Toggle from '../node/parameters/Toggle.svelte';

  const DEFAULT_FRAME_RATE = 120;
  const DEFAULT_WIDTH = 1920;
  const DEFAULT_HEIGHT = 1080;
  const DEFAULT_DURATION = 10;
  const DEFAULT_VIDEO_BITRATE_MBPS = 10;
  const DEFAULT_TIME_RANGE_STEP_SECONDS = 0.01;

  type ResolutionPreset = '1920x1080' | '1080x1920' | 'custom';

  const VIDEO_BITRATE_PRESET_MBPS = [5, 10, 25, 50] as const;
  type BitratePreset = (typeof VIDEO_BITRATE_PRESET_MBPS)[number] | 'custom';

  function mbpsToInitialBitratePreset(mbps: number): BitratePreset {
    for (const v of VIDEO_BITRATE_PRESET_MBPS) {
      if (v === mbps) return v;
    }
    return 'custom';
  }

  export interface VideoExportConfig {
    width: number;
    height: number;
    maxDurationSeconds: number;
    useFullAudio: boolean;
    /** Start time (seconds) relative to the primary track. */
    startSeconds?: number;
    /** End time (seconds) relative to the primary track. */
    endSeconds?: number;
    allowVideoOnly: boolean;
    highFidelityAudio: boolean;
    videoBitrate?: number;
    audioBitrate?: number;
    frameRate: number;
  }

  /** When no audio: primaryNodeId, buffer, audioDurationSeconds are omitted. */
  type VideoExportConfirmPayload = VideoExportConfig & {
    primaryNodeId?: string;
    buffer?: AudioBuffer;
    audioDurationSeconds?: number;
  };

  interface Props {
    visible?: boolean;
    onClose?: () => void;
    onConfirm?: (config: VideoExportConfirmPayload) => void;
    getPrimaryAudio?: () => { nodeId: string; buffer: AudioBuffer } | null;
  }

  let {
    visible = false,
    onClose,
    onConfirm,
    getPrimaryAudio = () => null,
  }: Props = $props();

  let resolutionPreset = $state<ResolutionPreset>('1920x1080');
  let customWidth = $state(DEFAULT_WIDTH);
  let customHeight = $state(DEFAULT_HEIGHT);
  let duration = $state(DEFAULT_DURATION);
  let useFullAudio = $state(false);
  let allowVideoOnly = $state(false);
  let highFidelityAudio = $state(false);
  let bitrateMbps = $state(DEFAULT_VIDEO_BITRATE_MBPS);
  let bitratePreset = $state<BitratePreset>(mbpsToInitialBitratePreset(DEFAULT_VIDEO_BITRATE_MBPS));
  let fps = $state(DEFAULT_FRAME_RATE);
  let errorMessage = $state('');

  const primary = $derived(getPrimaryAudio());
  const durationPlaceholder = $derived(primary ? `Audio length: ${primary.buffer.duration.toFixed(1)}s` : 'No audio — export will be video only');

  let rangeStartSeconds = $state(0);
  let rangeEndSeconds = $state(DEFAULT_DURATION);

  $effect(() => {
    if (!primary) return;
    const d = primary.buffer.duration;
    if (useFullAudio) {
      rangeStartSeconds = 0;
      rangeEndSeconds = d;
      return;
    }
    // Initialize / clamp range to valid values
    rangeStartSeconds = Math.max(0, Math.min(d, rangeStartSeconds));
    rangeEndSeconds = Math.max(rangeStartSeconds, Math.min(d, rangeEndSeconds));
    // Keep default duration behavior: when range was never touched, use the duration input as initial window.
    if (rangeStartSeconds === 0 && rangeEndSeconds === DEFAULT_DURATION) {
      rangeEndSeconds = Math.min(d, duration || DEFAULT_DURATION);
    }
  });

  function tryConfirm() {
    errorMessage = '';
    const primaryNow = getPrimaryAudio();
    const width =
      resolutionPreset === 'custom'
        ? Math.max(1, Math.min(4096, customWidth || DEFAULT_WIDTH))
        : resolutionPreset === '1920x1080'
          ? 1920
          : 1080;
    const height =
      resolutionPreset === 'custom'
        ? Math.max(1, Math.min(4096, customHeight || DEFAULT_HEIGHT))
        : resolutionPreset === '1920x1080'
          ? 1080
          : 1920;
    const videoBitrate = Math.max(1_000_000, Math.min(100_000_000, Math.round((bitrateMbps || DEFAULT_VIDEO_BITRATE_MBPS) * 1_000_000)));

    if (primaryNow) {
      const { nodeId: primaryNodeId, buffer } = primaryNow;
      const clampedStart = useFullAudio ? 0 : Math.max(0, Math.min(buffer.duration, rangeStartSeconds));
      const clampedEnd = useFullAudio
        ? buffer.duration
        : Math.max(clampedStart, Math.min(buffer.duration, rangeEndSeconds));
      const rangeDuration = Math.max(0.01, clampedEnd - clampedStart);
      // With audio loaded, the selected range is the source of truth for export length.
      const maxDurationSeconds = useFullAudio ? buffer.duration : rangeDuration;
      onConfirm?.({
        width,
        height,
        maxDurationSeconds,
        useFullAudio,
        startSeconds: useFullAudio ? 0 : clampedStart,
        endSeconds: useFullAudio ? buffer.duration : clampedEnd,
        allowVideoOnly: false,
        highFidelityAudio,
        videoBitrate,
        audioBitrate: 192_000,
        frameRate: fps,
        primaryNodeId,
        buffer,
        audioDurationSeconds: buffer.duration,
      });
    } else {
      if (!allowVideoOnly) {
        errorMessage = 'No audio loaded. Load a track first, or turn on "Video only".';
        return;
      }
      const maxDuration = duration || DEFAULT_DURATION;
      onConfirm?.({
        width,
        height,
        maxDurationSeconds: maxDuration,
        useFullAudio: false,
        allowVideoOnly: true,
        highFidelityAudio: false,
        videoBitrate,
        audioBitrate: 192_000,
        frameRate: fps,
      });
    }
    onClose?.();
  }

  function setResolutionPreset(preset: ResolutionPreset) {
    resolutionPreset = preset;
    if (preset === '1920x1080') {
      customWidth = 1920;
      customHeight = 1080;
    } else if (preset === '1080x1920') {
      customWidth = 1080;
      customHeight = 1920;
    }
  }

  function setFps(value: number) {
    fps = value;
  }

  function setBitratePreset(preset: BitratePreset) {
    bitratePreset = preset;
    if (preset !== 'custom') {
      bitrateMbps = preset;
    }
  }

  /** User-adjusted range implies a clip, not the full track. */
  function handleExportRangeChange(low: number, high: number) {
    useFullAudio = false;
    rangeStartSeconds = low;
    rangeEndSeconds = high;
  }
</script>

<!--
  Layout: header + footer on modal `.frame` surface; single full-width `frame-elevated` card in `.main` (AudioSignalPicker pattern).
-->
<Modal open={visible} onClose={onClose} class="video-export-dialog">
  <div class="export-shell">
    <header class="panel-header">
      <div class="header-left">
        <h2 id="video-export-dialog-title" class="dialog-title">Export video</h2>
      </div>
      <div class="header-right">
        <Button
          variant="ghost"
          size="sm"
          mode="both"
          iconPosition="trailing"
          class="close-btn"
          onclick={() => onClose?.()}
          aria-label="Close dialog"
        >
          Close
          <IconSvg name="x" variant="line" />
        </Button>
      </div>
    </header>

    <div class="main">
      <div class="section export-panel frame-elevated">
        {#if errorMessage}
          <div class="error" role="alert">{errorMessage}</div>
        {/if}

        <div class="group">
          {#if primary && primary.buffer.duration > 0}
            <div class="duration-range">
              <div class="time-range-row">
                <div class="time-range-label">Start</div>
                <div class="time-range-value">{rangeStartSeconds.toFixed(2)}s</div>
                <div class="time-range-spacer"></div>
                <div class="time-range-label">End</div>
                <div class="time-range-value">{rangeEndSeconds.toFixed(2)}s</div>
              </div>
              <RangeSlider
                min={0}
                max={primary.buffer.duration}
                step={DEFAULT_TIME_RANGE_STEP_SECONDS}
                lowValue={rangeStartSeconds}
                highValue={rangeEndSeconds}
                disabled={useFullAudio}
                class="time-range-slider"
                onChange={({ low, high }) => handleExportRangeChange(low, high)}
              />
              <div class="time-range-row secondary">
                <div class="time-range-label">Window</div>
                <div class="time-range-value">{Math.max(0, rangeEndSeconds - rangeStartSeconds).toFixed(2)}s</div>
                <div class="time-range-spacer"></div>
                <div class="time-range-label">Track</div>
                <div class="time-range-value">{primary.buffer.duration.toFixed(2)}s</div>
              </div>
            </div>
          {:else}
            <Input
              type="number"
              value={String(duration)}
              oninput={(e: Event) =>
                (duration = parseFloat((e.target as HTMLInputElement).value) || DEFAULT_DURATION)}
              placeholder={durationPlaceholder}
              min={0.1}
              step={0.1}
              class="input-full"
            />
          {/if}

          <div class="toggle-stack">
            <div class="toggle-row-split" role="group" aria-label="Export audio options">
              <div class="toggle-row toggle-row--cell">
                <Toggle
                  labelledBy="video-export-label-full-audio"
                  value={useFullAudio ? 1 : 0}
                  onChange={(v) => (useFullAudio = v === 1)}
                />
                <span id="video-export-label-full-audio" class="toggle-label">Full export</span>
              </div>
              <div class="toggle-row toggle-row--cell">
                {#if primary}
                  <Toggle
                    labelledBy="video-export-label-hifi"
                    value={highFidelityAudio ? 1 : 0}
                    onChange={(v) => (highFidelityAudio = v === 1)}
                  />
                  <span id="video-export-label-hifi" class="toggle-label">Better analyser quality</span>
                {:else}
                  <Toggle
                    labelledBy="video-export-label-video-only"
                    value={allowVideoOnly ? 1 : 0}
                    onChange={(v) => (allowVideoOnly = v === 1)}
                  />
                  <span id="video-export-label-video-only" class="toggle-label">Video only</span>
                {/if}
              </div>
            </div>
          </div>
        </div>

        <div class="group">
          <div class="field-label">Resolution</div>
          <div class="tag-container export-pills" role="group" aria-label="Resolution presets">
            <Tag interactive selected={resolutionPreset === '1920x1080'} onclick={() => setResolutionPreset('1920x1080')}>
              1920×1080
            </Tag>
            <Tag interactive selected={resolutionPreset === '1080x1920'} onclick={() => setResolutionPreset('1080x1920')}>
              1080×1920
            </Tag>
            <Tag interactive selected={resolutionPreset === 'custom'} onclick={() => setResolutionPreset('custom')}>
              Custom
            </Tag>
          </div>

          {#if resolutionPreset === 'custom'}
            <div class="custom-resolution">
              <Input
                type="number"
                value={String(customWidth)}
                oninput={(e: Event) => (customWidth = parseInt((e.target as HTMLInputElement).value, 10) || DEFAULT_WIDTH)}
                placeholder="Width"
                aria-label="Width"
                min={1}
                max={4096}
              />
              <Input
                type="number"
                value={String(customHeight)}
                oninput={(e: Event) =>
                  (customHeight = parseInt((e.target as HTMLInputElement).value, 10) || DEFAULT_HEIGHT)}
                placeholder="Height"
                aria-label="Height"
                min={1}
                max={4096}
              />
            </div>
          {/if}

          <div class="field-label">Frame rate</div>
          <div class="tag-container export-pills" role="group" aria-label="Frame rate presets">
            <Tag interactive selected={fps === 120} onclick={() => setFps(120)}>120</Tag>
            <Tag interactive selected={fps === 60} onclick={() => setFps(60)}>60</Tag>
            <Tag interactive selected={fps === 30} onclick={() => setFps(30)}>30</Tag>
          </div>

          <div class="field-label">Video bitrate (Mbps)</div>
          <div class="tag-container export-pills" role="group" aria-label="Video bitrate presets">
            {#each VIDEO_BITRATE_PRESET_MBPS as mbps}
              <Tag interactive selected={bitratePreset === mbps} onclick={() => setBitratePreset(mbps)}>
                {mbps}
              </Tag>
            {/each}
            <Tag interactive selected={bitratePreset === 'custom'} onclick={() => setBitratePreset('custom')}>
              Custom
            </Tag>
          </div>
          {#if bitratePreset === 'custom'}
            <Input
              type="number"
              value={String(bitrateMbps)}
              oninput={(e: Event) =>
                (bitrateMbps = parseFloat((e.target as HTMLInputElement).value) || DEFAULT_VIDEO_BITRATE_MBPS)}
              placeholder={String(DEFAULT_VIDEO_BITRATE_MBPS)}
              min={1}
              max={100}
              aria-label="Custom video bitrate"
              class="input-full"
            />
          {/if}
        </div>
      </div>
    </div>

    <footer class="footer">
      <div class="actions">
        <Button variant="ghost" size="md" onclick={onClose}>Close</Button>
        <Button variant="warning" size="md" onclick={tryConfirm}>Export Video</Button>
      </div>
    </footer>
  </div>
</Modal>

<style>
  /* Modal content - :global required for Modal portal */
  /* Shell: panel header → scroll main (one elevated card, full width) → footer on frame bg. */
  :global(.video-export-dialog.content.frame) {
    width: min(480px, 94vw);
    min-width: min(360px, 94vw);

    display: flex;
    flex-direction: column;
    min-height: 0;
    /* Overrides global `.frame` padding: shell controls inset (FloatingPanel-like chrome). */
    padding: 0;

    .export-shell {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      gap: 0;
    }

    /* FloatingPanel-compatible header (.content > header). No drag-indicator in modal chrome. */
    .panel-header {
      position: relative;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--pd-md);
      padding: var(--pd-xs) var(--pd-xs) var(--pd-xs) var(--pd-md);
      margin-bottom: var(--pd-md);
      min-height: var(--size-sm);
      /* Same surface as modal `.frame` (--frame-bg); no inner elevated strip */
      background: transparent;
    }

    .header-left {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
    }

    .header-right {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }

    .dialog-title {
      margin: 0;
      flex: 1;
      min-width: 0;
      font-size: var(--text-sm);
      font-weight: 500;
      line-height: 1.2;
      color: var(--print-light);
      letter-spacing: 0;
    }

    :global(.close-btn.button) {
      border-radius: calc(var(--radius-md) - var(--pd-xs));
    }

    /* Scroll the elevated panel only; full horizontal bleed (matches compact: one card edge-to-edge). */
    .main {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding: 0;
    }

    /*
     * Single `frame-elevated` card: all corners rounded, full width of dialog content.
     * Matches AudioSignalPickerCompact `.section.frame-elevated` sitting under panel chrome.
     */
    .export-panel.section.frame-elevated {
      display: flex;
      flex-direction: column;
      gap: var(--pd-xl);
      width: 100%;
      padding: var(--pd-xl) var(--pd-xl);
      box-sizing: border-box;
      flex-shrink: 0;
      border-radius: var(--frame-elevated-radius);
    }

    .group {
      display: flex;
      flex-direction: column;
      gap: var(--pd-sm);
    }

    .group + .group {
      padding-top: var(--pd-xl);
      border-top: 1px solid var(--divider);
    }

    .field-label {
      display: block;
      margin: var(--pd-sm) 0 var(--pd-xs);
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--label-color);
      letter-spacing: 0;
      margin: var(--pd-md) 0 var(--pd-xs) 0;

      &:first-child,
      &:first-of-type {
        margin-top: 0;
      }
    }

    .error {
      font-size: var(--text-sm);
      color: var(--color-red-90);
      padding: var(--pd-sm) var(--pd-md);
      border-radius: var(--radius-sm);
      border: 1px solid color-mix(in srgb, var(--color-red-90) 40%, transparent);
      background: color-mix(in srgb, var(--color-red-80) 25%, transparent);
    }

    :global(.tag-container.export-pills) {
      gap: var(--pd-xs);
    }

    :global(.tag-container.export-pills .tag) {
      letter-spacing: 0;
    }

    .custom-resolution {
      display: flex;
      gap: var(--pd-sm);
      align-items: center;
      box-sizing: border-box;
    }

    .custom-resolution :global(.input) {
      flex: 1;
      min-width: 0;
    }

    .toggle-stack {
      padding-top: var(--pd-md);
    }

    .toggle-row-split {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: var(--pd-xl);
      width: 100%;
      box-sizing: border-box;
    }

    .toggle-row {
      display: inline-flex;
      align-items: center;
      justify-content: flex-start;
      gap: var(--pd-sm);
      box-sizing: border-box;
    }

    .toggle-row--cell {
      min-width: 0;
    }

    .toggle-label {
      min-width: 0;
      font-size: var(--text-sm);
      font-weight: 500;
      color: color-mix(in srgb, var(--color-gray-130) 90%, var(--color-gray-50));
      user-select: none;
    }

    .toggle-row :global(.toggle) {
      flex-shrink: 0;
    }

    .footer {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      min-height: 0;
      padding: var(--pd-lg) var(--pd-md) var(--pd-md) var(--pd-md);
      background: transparent;
    }

    .actions {
      display: flex;
      gap: var(--pd-md);
      justify-content: flex-end;
    }

    :global(.input-full.input) {
      width: 100%;
      box-sizing: border-box;
    }

    /* Flat block inside `frame-elevated` — no second inset card */
    .duration-range {
      display: flex;
      flex-direction: column;
      gap: var(--pd-sm);
      --time-range-row-color: color-mix(in srgb, var(--color-gray-130) 88%, var(--color-gray-50));
      --time-range-row-muted: color-mix(in srgb, var(--color-gray-120) 85%, var(--color-gray-50));
    }

    .time-range-row {
      display: flex;
      align-items: baseline;
      gap: var(--pd-sm);
      font-size: var(--text-xs);
      color: var(--time-range-row-color);

      &.secondary {
        color: var(--time-range-row-muted);
      }
    }

    .time-range-label {
      min-width: 38px;
      color: inherit;
      font-weight: 600;
    }

    .time-range-value {
      font-variant-numeric: tabular-nums;
      color: inherit;
      font-weight: 500;
    }

    .time-range-spacer {
      flex: 1;
    }

    .duration-range :global(.range-slider.time-range-slider) {
      width: 100%;
      --range-slider-track-height: 60px;
      --range-slider-bg: color-mix(in srgb, var(--color-gray-30) 75%, black);
      --range-slider-track-color: color-mix(in srgb, var(--color-gray-110) 20%, transparent);
      --range-slider-active-color: color-mix(in srgb, var(--color-teal-100) 65%, transparent);
      --range-editor-handle-bg: var(--color-teal-100);
      --range-editor-handle-hover-bg: var(--color-teal-110);
      --range-editor-handle-active-bg: var(--color-teal-120);
    }
  }
</style>
