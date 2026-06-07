<script lang="ts">
  /**
   * Shared parameter-driver remap UI: normalized input gate + target range in parameter units.
   */
  import { Button, RemapRangeEditor } from '../ui';
  import {
    DRIVER_REMAP_IN_UI_MIN,
    DRIVER_REMAP_IN_UI_MAX,
    DRIVER_REMAP_IN_UI_STEP,
    resolveDriverTargetOutUiBounds,
    resolveDriverTargetOutUiStepAndDecimals,
  } from '../../../utils/driverRemap';

  export type DriverRemapSections = 'both' | 'gateOnly' | 'targetOnly';

  interface Props {
    inMin: number;
    inMax: number;
    outMin: number;
    outMax: number;
    disabled?: boolean;
    liveInValue?: number | null;
    liveOutValue?: number | null;
    /** Parameter spec min/max for optional "Match parameter" on target range. */
    paramMin?: number;
    paramMax?: number;
    /** Parameter spec step/type for Out ValueInput parity with node body controls. */
    paramStep?: number;
    paramType?: 'float' | 'int';
    matchParameterRange?: () => void;
    /** `driver-focused`: compact gate row for parameter driver panel. */
    controlsLayout?: 'default' | 'driver-focused';
    /** Which blocks to render — gate on remapper, Out on focused target. */
    sections?: DriverRemapSections;
    class?: string;
    onChange?: (payload: {
      inMin?: number;
      inMax?: number;
      outMin?: number;
      outMax?: number;
    }) => void;
    onCommit?: () => void;
  }

  let {
    inMin,
    inMax,
    outMin,
    outMax,
    disabled = false,
    liveInValue,
    liveOutValue,
    paramMin,
    paramMax,
    paramStep,
    paramType,
    matchParameterRange,
    controlsLayout = 'default',
    sections = 'both',
    class: className = '',
    onChange,
    onCommit,
  }: Props = $props();

  const showGate = $derived(sections === 'both' || sections === 'gateOnly');
  const showTarget = $derived(sections === 'both' || sections === 'targetOnly');

  const showMatchParameter = $derived(
    matchParameterRange != null &&
      paramMin != null &&
      paramMax != null &&
      Number.isFinite(paramMin) &&
      Number.isFinite(paramMax)
  );

  const targetOutBounds = $derived(resolveDriverTargetOutUiBounds(paramMin, paramMax));
  const targetOutInput = $derived(resolveDriverTargetOutUiStepAndDecimals(paramType, paramStep));

  function handleGateChange(payload: {
    inMin: number;
    inMax: number;
    outMin: number;
    outMax: number;
  }) {
    onChange?.({ inMin: payload.inMin, inMax: payload.inMax });
  }

  function handleMatchParameter(e: MouseEvent) {
    e.stopPropagation();
    matchParameterRange?.();
  }
</script>

<div class="driver-remap-section {className}" data-disabled={disabled || undefined}>
  {#if showGate}
  <section class="gate-block" aria-labelledby="driver-remap-gate-heading">
    <h3 id="driver-remap-gate-heading" class="block-heading">Input gate</h3>
    <RemapRangeEditor
      {inMin}
      {inMax}
      outMin={0}
      outMax={1}
      min={DRIVER_REMAP_IN_UI_MIN}
      max={DRIVER_REMAP_IN_UI_MAX}
      step={DRIVER_REMAP_IN_UI_STEP}
      showOutputRange={false}
      {disabled}
      {liveInValue}
      {controlsLayout}
      onChange={handleGateChange}
      {onCommit}
    />
  </section>
  {/if}

  {#if showTarget}
  <section class="target-range-block" aria-labelledby="driver-remap-target-heading">
    <div class="target-range-header">
      <h3 id="driver-remap-target-heading" class="block-heading">Target range</h3>
      {#if showMatchParameter}
        <Button
          variant="ghost"
          size="sm"
          mode="both"
          title="Set out min and max from the focused parameter"
          aria-label="Match parameter range"
          {disabled}
          onclick={handleMatchParameter}
        >
          Match parameter
        </Button>
      {/if}
    </div>
    <RemapRangeEditor
      inMin={DRIVER_REMAP_IN_UI_MIN}
      inMax={DRIVER_REMAP_IN_UI_MAX}
      {outMin}
      {outMax}
      min={targetOutBounds.min}
      max={targetOutBounds.max}
      step={targetOutInput.step}
      decimals={targetOutInput.decimals}
      showInputRange={false}
      showOutputRange={true}
      {disabled}
      {liveOutValue}
      {controlsLayout}
      onChange={(payload) =>
        onChange?.({
          ...(payload.outMin !== undefined ? { outMin: payload.outMin } : {}),
          ...(payload.outMax !== undefined ? { outMax: payload.outMax } : {}),
        })}
      {onCommit}
    />
    {#if liveOutValue != null}
      <p class="live-out-hint" aria-live="polite">
        Live: {liveOutValue.toFixed(3)}
      </p>
    {/if}
  </section>
  {/if}
</div>

<style>
  .driver-remap-section {
    display: flex;
    flex-direction: column;
    gap: var(--pd-md);
    width: 100%;
    min-width: 0;
    box-sizing: border-box;

    &[data-disabled] {
      opacity: var(--opacity-disabled);
      pointer-events: none;
    }

    .block-heading {
      margin: 0;
      font-size: var(--text-xs);
      font-weight: var(--font-weight-medium);
      color: var(--color-gray-100);
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .gate-block {
      display: flex;
      flex-direction: column;
      gap: var(--pd-xs);
      width: 100%;
    }

    .target-range-block {
      display: flex;
      flex-direction: column;
      gap: var(--pd-sm);
      width: 100%;
      padding-top: var(--pd-xs);
      border-top: 1px solid var(--panel-card-border);
    }

    .target-range-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--pd-sm);
      min-width: 0;
    }

    .live-out-hint {
      margin: 0;
      font-size: var(--text-xs);
      color: var(--color-gray-90);
      font-variant-numeric: tabular-nums;
    }
  }
</style>
