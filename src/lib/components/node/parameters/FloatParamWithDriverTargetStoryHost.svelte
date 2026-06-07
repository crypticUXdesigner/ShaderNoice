<script lang="ts">
  import FloatParamWithDriverTarget from './FloatParamWithDriverTarget.svelte';
  import type { ParamDriverTargetOut } from '../../../../utils/resolveParamDriverTargetOut';
  import type { DriverTargetOutUiPatch } from '../../../../utils/driverRemap';

  interface Props {
    value?: number;
    driverTargetOut?: ParamDriverTargetOut | null;
    driverBypassed?: boolean;
  }

  let {
    value = 0.35,
    driverTargetOut = { outMin: 0.1, outMax: 0.9 },
    driverBypassed = false,
  }: Props = $props();

  let liveValue = $state(value);
  let liveOut = $state(
    driverTargetOut ? { outMin: driverTargetOut.outMin, outMax: driverTargetOut.outMax } : null
  );

  $effect.pre(() => {
    liveValue = value;
    liveOut = driverTargetOut
      ? { outMin: driverTargetOut.outMin, outMax: driverTargetOut.outMax }
      : null;
  });

  function handleOutChange(patch: DriverTargetOutUiPatch) {
    if (!liveOut) return;
    liveOut = {
      outMin: patch.outMin ?? liveOut.outMin,
      outMax: patch.outMax ?? liveOut.outMax,
    };
  }
</script>

<div class="story-host">
  <FloatParamWithDriverTarget
    value={liveValue}
    min={0}
    max={1}
    step={0.01}
    decimals={2}
    paramMin={0}
    paramMax={1}
    paramType="float"
    paramStep={0.01}
    driverTargetOut={liveOut}
    {driverBypassed}
    onChange={(v) => {
      liveValue = v;
    }}
    onDriverTargetOutChange={handleOutChange}
  />
</div>

<style>
  .story-host {
    max-width: 220px;
  }
</style>
