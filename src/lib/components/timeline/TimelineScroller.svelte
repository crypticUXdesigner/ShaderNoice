<script lang="ts">
  import { wheelNonPassive } from '../../actions/wheelPassive';

  interface Props {
    scrollerLeftPct: number;
    scrollerWidthPct: number;
    onMouseDown: (e: MouseEvent) => void;
    onWheel: (e: WheelEvent) => void;
  }

  let { scrollerLeftPct, scrollerWidthPct, onMouseDown, onWheel }: Props = $props();
</script>

<div class="scroller-row">
  <div
    class="scroller"
    onmousedown={onMouseDown}
    use:wheelNonPassive={onWheel}
    role="presentation"
  >
    <div
      class="scroller-thumb"
      style="left: {scrollerLeftPct}%; width: {scrollerWidthPct}%"
    ></div>
  </div>
</div>

<style>
  .scroller-row {
    flex-shrink: 0;
    min-height: 12px;
  }

  .scroller {
    position: relative;
    width: 100%;
    height: var(--size-2xs);
    border-radius: var(--radius-2xs);
    background: var(--color-gray-50);
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  .scroller-thumb {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    border-radius: var(--radius-2xs);
    background: var(--color-teal-gray-110);
    pointer-events: none;
  }
</style>

