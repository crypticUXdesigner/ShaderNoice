<script lang="ts">
  import Knob, { type DriverTargetOutPatch, type DriverTargetOutState } from './Knob.svelte';

  interface Props {
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    decimals?: number;
    connected?: boolean;
    driverTargetOut?: DriverTargetOutState;
    outBounds?: { min: number; max: number };
    driverBypassed?: boolean;
  }

  let {
    value = 0.42,
    min = 0,
    max = 1,
    step = 0.01,
    decimals = 2,
    connected = false,
    driverTargetOut = { outMin: 0.1, outMax: 0.9 },
    outBounds,
    driverBypassed = false,
  }: Props = $props();

  let liveValue = $state(value);
  let liveOut = $state({ ...driverTargetOut });

  $effect(() => {
    liveValue = value;
  });

  $effect(() => {
    liveOut = { ...driverTargetOut };
  });

  function handleChange(next: number) {
    liveValue = next;
  }

  function handleOutChange(patch: DriverTargetOutPatch) {
    liveOut = { ...liveOut, ...patch };
  }
</script>

<Knob
  value={liveValue}
  {min}
  {max}
  {step}
  {decimals}
  {connected}
  driverTargetOut={liveOut}
  {outBounds}
  {driverBypassed}
  onChange={handleChange}
  onCommit={handleChange}
  onDriverTargetOutChange={handleOutChange}
  onDriverTargetOutCommit={() => {}}
/>
