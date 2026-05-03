<script lang="ts">
  interface Props {
    label: string;
    selected?: boolean;
    disabled?: boolean;
    onclick?: (e: MouseEvent) => void;
  }

  let { label, selected = false, disabled = false, onclick }: Props = $props();

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
    if (!disabled) {
      onclick?.(e);
    }
  }
</script>

<button
  type="button"
  class="track-list-item"
  class:is-selected={selected}
  class:is-disabled={disabled}
  {disabled}
  onclick={handleClick}
>
  <span class="track-list-item__label">{label}</span>
</button>

<style>
  .track-list-item {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    min-width: 0;
    margin: 0;
    height: var(--size-md);
    padding: var(--pd-sm) var(--pd-md);
    border: none;
    border-radius: var(--radius-md);
    background: var(--ghost-bg);
    color: var(--print-highlight);
    font-family: inherit;
    font-size: var(--text-sm);
    font-weight: 400;
    line-height: inherit;
    text-align: left;
    cursor: pointer;
    appearance: none;
    box-sizing: border-box;
    user-select: none;
    transition:
      background var(--motion-effects-fast-duration) var(--motion-effects-fast-easing),
      transform var(--motion-effects-fast-duration) var(--motion-effects-fast-easing),
      color var(--motion-effects-fast-duration) var(--motion-effects-fast-easing);

    &:focus {
      outline: none;
    }

    &:focus-visible {
      outline: 2px solid var(--color-blue-90);
      outline-offset: 2px;
    }
  }

  .track-list-item__label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .track-list-item:hover:not(.is-disabled) {
    transform: translateX(var(--pd-2xs));
    background: var(--ghost-bg-hover);
    color: var(--print-light);
  }

  .track-list-item.is-selected:not(.is-disabled) {
    background: var(--ghost-bg-active);
    color: var(--color-blue-110);
  }

  .track-list-item.is-disabled {
    opacity: var(--opacity-disabled);
    cursor: not-allowed;
    pointer-events: none;
  }
</style>
