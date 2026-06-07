<script lang="ts">
  /**
   * ValueInput float control with optional compact driver target Out row below.
   */
  import { ValueInput } from '../../ui';
  import NodeDriverTargetOutRow from './NodeDriverTargetOutRow.svelte';
  import type { DriverTargetOutUiPatch } from '../../../../utils/driverRemap';
  import type { ParamDriverTargetOut } from '../../../../utils/resolveParamDriverTargetOut';

  interface Props {
    value: number;
    min?: number;
    max?: number;
    step?: number;
    decimals?: number;
    paramMin?: number;
    paramMax?: number;
    paramType?: 'float' | 'int';
    paramStep?: number;
    driverTargetOut?: ParamDriverTargetOut | null;
    driverBypassed?: boolean;
    onChange?: (value: number) => void;
    onCommit?: () => void;
    onDriverTargetOutChange?: (patch: DriverTargetOutUiPatch) => void;
    onDriverTargetOutCommit?: () => void;
  }

  let {
    value,
    min = 0,
    max = 1,
    step = 0.01,
    decimals = 3,
    paramMin,
    paramMax,
    paramType,
    paramStep,
    driverTargetOut = null,
    driverBypassed = false,
    onChange,
    onCommit,
    onDriverTargetOutChange,
    onDriverTargetOutCommit,
  }: Props = $props();
</script>

<div class="float-param-with-driver-target">
  <ValueInput {value} {min} {max} {step} {decimals} {onChange} {onCommit} />
  {#if driverTargetOut}
    <NodeDriverTargetOutRow
      outMin={driverTargetOut.outMin}
      outMax={driverTargetOut.outMax}
      {paramMin}
      {paramMax}
      {paramType}
      {paramStep}
      liveOutValue={value}
      {driverBypassed}
      onChange={onDriverTargetOutChange}
      onCommit={onDriverTargetOutCommit}
    />
  {/if}
</div>

<style>
  .float-param-with-driver-target {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    gap: var(--pd-xs);
  }
</style>
