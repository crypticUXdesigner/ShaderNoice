<script lang="ts">
  /**
   * Compact driver target Out range for non-knob float params on the node body.
   * Output-only RemapRangeEditor — same bounds/step helpers as DriverRemapSection.
   */
  import { RemapRangeEditor } from '../../ui';
  import {
    DRIVER_REMAP_IN_UI_MAX,
    DRIVER_REMAP_IN_UI_MIN,
    resolveDriverTargetOutUiBounds,
    resolveDriverTargetOutUiStepAndDecimals,
    type DriverTargetOutUiPatch,
  } from '../../../../utils/driverRemap';

  interface Props {
    outMin: number;
    outMax: number;
    paramMin?: number;
    paramMax?: number;
    paramType?: 'float' | 'int';
    paramStep?: number;
    liveOutValue?: number | null;
    driverBypassed?: boolean;
    onChange?: (patch: DriverTargetOutUiPatch) => void;
    onCommit?: () => void;
  }

  let {
    outMin,
    outMax,
    paramMin,
    paramMax,
    paramType,
    paramStep,
    liveOutValue,
    driverBypassed = false,
    onChange,
    onCommit,
  }: Props = $props();

  const targetOutBounds = $derived(resolveDriverTargetOutUiBounds(paramMin, paramMax));
  const targetOutInput = $derived(resolveDriverTargetOutUiStepAndDecimals(paramType, paramStep));
</script>

<div class="node-driver-target-out-row" class:is-driver-bypassed={driverBypassed}>
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
    controlsLayout="driver-focused"
    {liveOutValue}
    onChange={(payload) =>
      onChange?.({
        ...(payload.outMin !== undefined ? { outMin: payload.outMin } : {}),
        ...(payload.outMax !== undefined ? { outMax: payload.outMax } : {}),
      })}
    {onCommit}
  />
</div>

<style>
  .node-driver-target-out-row {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    gap: var(--pd-xs);

    &.is-driver-bypassed {
      opacity: var(--opacity-disabled);
    }
  }
</style>
