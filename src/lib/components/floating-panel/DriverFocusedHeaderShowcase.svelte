<script lang="ts">

  /** Storybook: three focused header variants (audio / animation / MIDI). */

  import DriverFocusedHeader from './DriverFocusedHeader.svelte';

  import CurveEditorDriverToolbar from './CurveEditorDriverToolbar.svelte';

  import type { DriverTargetDisplay } from './driverTargetDisplay';



  const audioTarget: DriverTargetDisplay = {

    nodeId: 'n1',

    paramName: 'amount',

    paramLabel: 'Amount',

    nodeLabel: 'Color gradient',

    nodeIconIdentifier: 'grid',

    fullTitle: 'Color gradient · Amount',

  };



  const animationTarget: DriverTargetDisplay = {

    nodeId: 'n2',

    paramName: 'radius',

    paramLabel: 'Radius',

    nodeLabel: 'Sphere',

    nodeIconIdentifier: 'sphere',

    fullTitle: 'Sphere · Radius',

  };



  const midiTarget: DriverTargetDisplay = {

    nodeId: 'n3',

    paramName: 'intensity',

    paramLabel: 'Intensity',

    nodeLabel: 'Bloom',

    nodeIconIdentifier: 'sparkle',

    fullTitle: 'Bloom · Intensity',

  };



  const sampleCurve = {

    keyframes: [

      { time: 0, value: 0.2 },

      { time: 1, value: 0.8 },

    ],

    interpolation: 'bezier' as const,

  };

</script>



<div class="showcase">

  <section aria-label="Audio focused header">

    <DriverFocusedHeader target={audioTarget} liveValue={0.742}>

      {#snippet trailing()}

        <span class="focused-source">01 · 20–20000 Hz</span>

      {/snippet}

    </DriverFocusedHeader>

  </section>

  <section aria-label="Animation focused header">

    <DriverFocusedHeader target={animationTarget} liveValue={0.5}>

      {#snippet trailing()}

        <CurveEditorDriverToolbar curve={sampleCurve} onCurveChange={() => {}} />

      {/snippet}

    </DriverFocusedHeader>

  </section>

  <section aria-label="MIDI focused header">

    <DriverFocusedHeader target={midiTarget} liveValue={0.125} />

  </section>

</div>



<style>

  .showcase {

    display: flex;

    flex-direction: column;

    gap: var(--pd-md);

    width: min(520px, calc(100vw - 32px));

    padding: var(--pd-md);

    background: var(--color-gray-30);

    border-radius: var(--radius-md);

    border: 1px solid var(--color-gray-60);

  }



  section {

    border-radius: var(--radius-md);

    overflow: hidden;

    border: 1px solid var(--color-gray-50);

  }



  .focused-source {

    min-width: 0;

    overflow: hidden;

    text-overflow: ellipsis;

    white-space: nowrap;

    font-size: var(--text-xs);

    color: var(--color-gray-100);

  }

</style>

