<script lang="ts">
  /**
   * Mini ramp glyph for ADSR curve presets — sampled from shared envelope easing.
   */
  import {
    buildEnvelopeCurveIconPathD,
    ENVELOPE_CURVE_ICON_VIEW_SIZE,
    type EnvelopeCurve,
  } from '../../../../utils/envelopeEasing';

  interface Props {
    curve: EnvelopeCurve;
    class?: string;
  }

  let { curve, class: className = '' }: Props = $props();

  const curvePath = $derived(buildEnvelopeCurveIconPathD(curve));
</script>

<span class="envelope-curve-icon {className}" aria-hidden="true">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 {ENVELOPE_CURVE_ICON_VIEW_SIZE} {ENVELOPE_CURVE_ICON_VIEW_SIZE}"
    fill="none"
    stroke="currentColor"
  >
    <path d={curvePath} class="curve" vector-effect="non-scaling-stroke" />
  </svg>
</span>

<style>
  .envelope-curve-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .envelope-curve-icon :global(svg) {
    display: block;
    flex-shrink: 0;
    pointer-events: none;
    width: 1em;
    height: 1em;
    min-width: 16px;
    min-height: 16px;
  }

  .curve {
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
