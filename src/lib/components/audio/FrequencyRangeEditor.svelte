<script lang="ts">
  /**
   * FrequencyRangeEditor
   * Compose: SpectrumStrip, FrequencyScale, RangeSlider (horizontal), ValueInput controls grid.
   * Spectrum parity: selected teal, unselected gray; log scale 20–20k Hz.
   */
  import SpectrumStrip from './SpectrumStrip.svelte';
  import FrequencyScale from './FrequencyScale.svelte';
  import { RangeSlider, ValueInput, Button, DropdownMenu, MenuItem } from '../ui';
  import { hzToNorm, normToHz, FREQ_MIN, FREQ_MAX } from './frequencyUtils';
  import type { AudioBandMode } from '../../../data-model/audioSetupTypes';

  const DEFAULT_HALF_LIFE_SECONDS = 1 / 120;

  type BandModeOption = { value: AudioBandMode; label: string; desc: string };

  const BAND_MODE_OPTIONS: ReadonlyArray<BandModeOption> = [
    { value: 'mean', label: 'Mean', desc: 'Smooth response. Transients are softened.' },
    { value: 'max', label: 'Max', desc: 'Snappy response. Reacts to transients.' },
    { value: 'rms', label: 'RMS', desc: 'Balanced. Loudness-weighted average.' },
  ];

  interface Props {
    /** [[minHz, maxHz]] - single band */
    frequencyBands: [[number, number]];
    spectrumData?: number[] | Uint8Array;
    sampleRate?: number;
    fftSize?: number;
    /** When provided with onFftSizeChange, value shown in FFT size input (e.g. band.fftSize) */
    fftSizeValue?: number;
    smoothing?: number;
    /** Optional attack half-life (seconds) for rising edges. When provided with handler, preferred over symmetric half-life. */
    attackHalfLifeSeconds?: number;
    /** Optional release half-life (seconds) for falling edges. When provided with handler, preferred over symmetric half-life. */
    releaseHalfLifeSeconds?: number;
    bandMode?: AudioBandMode;
    disabled?: boolean;
    class?: string;
    /** When false, attack/release/FFT row is hidden (e.g. when shown elsewhere). */
    showSmoothingFft?: boolean;
    onChange?: (bands: [[number, number]]) => void;
    onCommit?: () => void;
    onSmoothingChange?: (value: number) => void;
    onAttackHalfLifeSecondsChange?: (value: number | undefined) => void;
    onReleaseHalfLifeSecondsChange?: (value: number | undefined) => void;
    onFftSizeChange?: (value: number) => void;
    onBandModeChange?: (mode: AudioBandMode) => void;
  }

  let {
    frequencyBands = [[FREQ_MIN, FREQ_MAX]],
    spectrumData = [],
    sampleRate = 44100,
    fftSize = 2048,
    fftSizeValue,
    smoothing = 0.5,
    attackHalfLifeSeconds,
    releaseHalfLifeSeconds,
    bandMode = 'mean',
    disabled = false,
    class: className = '',
    showSmoothingFft = true,
    onChange,
    onCommit,
    onSmoothingChange,
    onAttackHalfLifeSecondsChange,
    onReleaseHalfLifeSecondsChange,
    onFftSizeChange,
    onBandModeChange,
  }: Props = $props();

  let modeMenuOpen = $state(false);
  let modeAnchorEl = $state<HTMLDivElement | undefined>();

  const FFT_SIZE_MIN = 256;
  const FFT_SIZE_MAX = 8192;
  const FFT_SIZE_STEP = 256;

  const band = $derived(frequencyBands[0] ?? [FREQ_MIN, FREQ_MAX]);
  const minHz = $derived(Math.max(FREQ_MIN, Math.min(FREQ_MAX, band[0] ?? FREQ_MIN)));
  const maxHz = $derived(Math.max(FREQ_MIN, Math.min(FREQ_MAX, band[1] ?? FREQ_MAX)));

  const minNorm = $derived(hzToNorm(minHz));
  const maxNorm = $derived(hzToNorm(maxHz));

  const showModeControl = $derived(onBandModeChange != null);
  const showTimingRow = $derived(
    showSmoothingFft &&
      (onFftSizeChange != null ||
        onAttackHalfLifeSecondsChange != null ||
        onReleaseHalfLifeSecondsChange != null ||
        onSmoothingChange != null)
  );
  const showAttackControl = $derived(
    onAttackHalfLifeSecondsChange != null || (showTimingRow && onSmoothingChange != null)
  );
  const showReleaseControl = $derived(onReleaseHalfLifeSecondsChange != null);
  const resolvedBandMode = $derived(bandMode ?? 'mean');
  const modeLabel = $derived(
    BAND_MODE_OPTIONS.find((o) => o.value === resolvedBandMode)?.label ?? 'Mean'
  );

  function handleRangeChange(payload: { low: number; high: number }) {
    const newMinHz = Math.round(normToHz(payload.low));
    const newMaxHz = Math.round(normToHz(payload.high));
    const clampedMin = Math.max(FREQ_MIN, Math.min(FREQ_MAX, newMinHz));
    const clampedMax = Math.max(FREQ_MIN, Math.min(FREQ_MAX, Math.max(clampedMin, newMaxHz)));
    onChange?.([[clampedMin, clampedMax]]);
  }

  function handleMinHzChange(value: number) {
    const clamped = Math.max(FREQ_MIN, Math.min(maxHz, Math.round(value)));
    onChange?.([[clamped, maxHz]]);
  }

  function handleMaxHzChange(value: number) {
    const clamped = Math.max(minHz, Math.min(FREQ_MAX, Math.round(value)));
    onChange?.([[minHz, clamped]]);
  }

  function handleSmoothingChange(value: number) {
    onSmoothingChange?.(Math.max(0, Math.min(1, value)));
  }

  function handleAttackHalfLifeMsChange(value: number) {
    const ms = Math.max(0, value);
    onAttackHalfLifeSecondsChange?.(ms / 1000);
  }

  function handleReleaseHalfLifeMsChange(value: number) {
    const ms = Math.max(0, value);
    onReleaseHalfLifeSecondsChange?.(ms / 1000);
  }

  function handleFftSizeChange(value: number) {
    const clamped = Math.max(
      FFT_SIZE_MIN,
      Math.min(FFT_SIZE_MAX, Math.round(value / FFT_SIZE_STEP) * FFT_SIZE_STEP)
    );
    onFftSizeChange?.(clamped);
  }
</script>

<div class="frequency-range-editor card-display {className}" data-disabled={disabled || undefined}>
  <div class="spectrum-with-slider display-graph">
    <SpectrumStrip
      spectrumData={spectrumData}
      selectedMin={minHz}
      selectedMax={maxHz}
      {sampleRate}
      {fftSize}
    />
    <div class="slider-overlay">
      <RangeSlider
        min={0}
        max={1}
        lowValue={minNorm}
        highValue={maxNorm}
        step={0.001}
        {disabled}
        onChange={handleRangeChange}
        onCommit={() => onCommit?.()}
        class="freq-range-slider"
      />
    </div>
  </div>
  <div class="scale">
    <FrequencyScale />
  </div>
  <div class="controls-grid">
    <div class="control control-start">
      <ValueInput
        value={minHz}
        min={FREQ_MIN}
        max={FREQ_MAX}
        step={1}
        decimals={0}
        size="sm"
        {disabled}
        onChange={handleMinHzChange}
        onCommit={() => onCommit?.()}
        class="freq-input freq-input-start"
      />
      <span class="label">Start</span>
    </div>

    <div class="grid-spacer" aria-hidden="true"></div>
    <div class="grid-spacer" aria-hidden="true"></div>

    <div class="control control-end">
      <ValueInput
        value={maxHz}
        min={FREQ_MIN}
        max={FREQ_MAX}
        step={1}
        decimals={0}
        size="sm"
        {disabled}
        onChange={handleMaxHzChange}
        onCommit={() => onCommit?.()}
        class="freq-input freq-input-end"
      />
      <span class="label">End</span>
    </div>

    {#if showTimingRow}
      {#if showModeControl}
        <div class="control control-mode">
          <div class="mode-anchor" bind:this={modeAnchorEl}>
            <Button
              variant="secondary"
              size="sm"
              mode="both"
              class="mode-button"
              aria-label="Band analysis mode"
              {disabled}
              onclick={() => (modeMenuOpen = !modeMenuOpen)}
            >
              {modeLabel}
            </Button>
            <DropdownMenu open={modeMenuOpen} anchor={modeAnchorEl} onClose={() => (modeMenuOpen = false)}>
              {#snippet children()}
                {#each BAND_MODE_OPTIONS as option (option.value)}
                  <MenuItem
                    label={option.label}
                    desc={option.desc}
                    selected={resolvedBandMode === option.value}
                    onclick={() => {
                      onBandModeChange?.(option.value);
                      modeMenuOpen = false;
                    }}
                  />
                {/each}
              {/snippet}
            </DropdownMenu>
          </div>
          <span class="label">Mode</span>
        </div>
      {:else}
        <div class="grid-spacer" aria-hidden="true"></div>
      {/if}

      {#if showAttackControl}
        <div class="control">
          {#if onAttackHalfLifeSecondsChange != null}
            <ValueInput
              value={Math.round(((attackHalfLifeSeconds ?? DEFAULT_HALF_LIFE_SECONDS) as number) * 1000)}
              min={0}
              max={10000}
              step={1}
              decimals={0}
              size="sm"
              {disabled}
              onChange={handleAttackHalfLifeMsChange}
              onCommit={handleAttackHalfLifeMsChange}
              class="attack-half-life-input"
            />
          {:else}
            <ValueInput
              value={smoothing}
              min={0}
              max={1}
              step={0.01}
              decimals={2}
              size="sm"
              {disabled}
              onChange={handleSmoothingChange}
              onCommit={handleSmoothingChange}
              class="smoothing-input"
            />
          {/if}
          <span class="label">{onAttackHalfLifeSecondsChange != null ? 'Attack' : 'Smooth'}</span>
        </div>
      {:else}
        <div class="grid-spacer" aria-hidden="true"></div>
      {/if}

      {#if showReleaseControl}
        <div class="control">
          <ValueInput
            value={Math.round(((releaseHalfLifeSeconds ?? DEFAULT_HALF_LIFE_SECONDS) as number) * 1000)}
            min={0}
            max={10000}
            step={1}
            decimals={0}
            size="sm"
            {disabled}
            onChange={handleReleaseHalfLifeMsChange}
            onCommit={handleReleaseHalfLifeMsChange}
            class="release-half-life-input"
          />
          <span class="label">Release</span>
        </div>
      {:else}
        <div class="grid-spacer" aria-hidden="true"></div>
      {/if}

      {#if onFftSizeChange != null}
        <div class="control">
          <ValueInput
            value={fftSizeValue ?? fftSize}
            min={FFT_SIZE_MIN}
            max={FFT_SIZE_MAX}
            step={FFT_SIZE_STEP}
            decimals={0}
            size="sm"
            {disabled}
            onChange={handleFftSizeChange}
            onCommit={handleFftSizeChange}
            class="fft-size-input"
          />
          <span class="label">FFT size</span>
        </div>
      {:else}
        <div class="grid-spacer" aria-hidden="true"></div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .frequency-range-editor {
    --spectrum-strip-height: var(--size-sm);

    &[data-disabled] {
      opacity: var(--opacity-disabled);
      pointer-events: none;
    }

    .spectrum-with-slider {
      height: var(--spectrum-strip-height);
      min-height: var(--spectrum-strip-height);
    }

    .slider-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;

      :global(.freq-range-slider) {
        --range-slider-track-height: var(--spectrum-strip-height);
        --range-slider-active-color: color-mix(in srgb, var(--color-teal-90) 10%, transparent);
        --range-slider-bg: transparent;
        --range-slider-track-color: transparent;
        --range-editor-handle-bg: var(--color-teal-100);
        --range-editor-handle-hover-bg: var(--color-teal-110);
        --range-editor-handle-active-bg: var(--color-teal-120);
      }
    }

    .scale {
      width: 100%;
    }

    .controls-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      column-gap: var(--pd-sm);
      row-gap: var(--pd-xs);
      width: 100%;
      margin-top: var(--pd-md);
    }

    .control {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: var(--pd-2xs);
      min-width: 0;

      :global(.value-input-wrapper) {
        width: 100%;
      }

      :global(.value-input) {
        width: 100%;
        box-sizing: border-box;
        justify-content: center;
      }

      .label {
        font-size: var(--text-xs);
        color: var(--color-gray-110);
        text-align: center;
      }
    }

    .control-mode {
      .mode-anchor {
        display: flex;
        justify-content: center;
        width: 100%;
      }

      :global(.mode-button) {
        width: 100%;
        justify-content: center;
      }
    }

    .grid-spacer {
      min-width: 0;
    }
  }
</style>
