<script lang="ts">
  /** Official Audiotool mark — not from Phosphor; inherits `currentColor`. */
  interface Props {
    class?: string;
  }

  let { class: className = '' }: Props = $props();
</script>

<span class="audiotool-mark-svg {className}" aria-hidden="true">
  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
    <path
      fill-rule="evenodd"
      d="M20.84 24a3.156 3.156 0 0 1-2.772-1.646A11.95 11.95 0 0 1 12 24C5.37 24 0 18.625 0 11.998 0 5.371 5.37 0 12 0s12 5.371 12 12.002v8.842A3.157 3.157 0 0 1 20.844 24m-8.84-17.683a5.685 5.685 0 0 0-5.685 5.685 5.68 5.68 0 0 0 5.685 5.681 5.682 5.682 0 0 0 5.684-5.681 5.685 5.685 0 0 0-5.684-5.685Z"
      clip-rule="evenodd"
    />
  </svg>
</span>

<style>
  .audiotool-mark-svg {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-right: var(--pd-sm);
  }

  .audiotool-mark-svg :global(svg) {
    display: block;
    flex-shrink: 0;
    pointer-events: none;
    width: 1em;
    height: 1em;
    min-width: 18px;
    min-height: 18px;
  }
</style>
