<script lang="ts">

  /**

   * Dark focused-driver bar: clickable target (left), optional trailing controls, live value (right).

   */

  import type { Snippet } from 'svelte';

  import DriverTargetNavButton from './DriverTargetNavButton.svelte';

  import { formatDriverLiveValue } from './driverFocusedHeaderUtils';

  import type { DriverTargetDisplay } from './driverTargetDisplay';



  interface Props {

    target: DriverTargetDisplay;

    liveValue?: number | null;

    onReveal?: (nodeId: string, paramName: string) => void;

    trailing?: Snippet;

    /** Inside frame-elevated driver body — no separate bar chrome. */
    embedded?: boolean;

    class?: string;

  }



  let {

    target,

    liveValue = null,

    onReveal,

    trailing,

    embedded = false,

    class: className = '',

  }: Props = $props();

</script>



<div class="driver-focused-header {className}" class:is-embedded={embedded}>

  <DriverTargetNavButton {target} {onReveal} />

  {#if trailing}

    <div class="bar-trailing" role="presentation">

      {@render trailing()}

    </div>

  {/if}

  {#if liveValue != null}

    <span class="live-value" title="Live driver output">{formatDriverLiveValue(liveValue)}</span>

  {/if}

</div>



<style>

  .driver-focused-header {

    display: flex;

    align-items: center;

    gap: var(--pd-sm);

    flex-shrink: 0;

    min-width: 0;

    min-height: var(--size-md);

    padding: var(--pd-sm) var(--pd-md);

    border-bottom: 1px solid var(--color-gray-50);

    background: var(--color-gray-20);

  }



  .bar-trailing {

    display: flex;

    align-items: center;

    gap: var(--pd-xs);

    flex: 1;

    min-width: 0;

    overflow: hidden;

  }



  .live-value {

    flex-shrink: 0;

    margin-left: auto;

    font-size: var(--text-xs);

    font-variant-numeric: tabular-nums;

    color: var(--color-violet-110);

  }

  .driver-focused-header.is-embedded {
    background: transparent;
    border-bottom: 1px solid var(--color-gray-70);
  }

</style>

