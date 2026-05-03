<script lang="ts">
  import { IconSvg } from '../ui';
  import type { IconName } from '../../../utils/iconsUiRegistry';

  export type PresetChipCategory = 'audio' | 'effects' | 'sdf';

  interface Props {
    displayName: string;
    icon: IconName;
    chipCategory: PresetChipCategory;
    busy: boolean;
    onFork: () => void;
  }

  let { displayName, icon, chipCategory, busy, onFork }: Props = $props();
</script>

<li class="list-item">
  <button
    type="button"
    class="row-card preset-row"
    data-category={chipCategory}
    disabled={busy}
    onclick={onFork}
    aria-label={`Use as new project: ${displayName}`}
    title="Use as new project"
  >
    <span class="icon-box" data-category={chipCategory} aria-hidden="true">
      <IconSvg name={icon} variant="filled" />
    </span>
    <span class="name preset-name">{displayName}</span>
    <span class="preset-open-hit" aria-hidden="true">
      <span class="preset-open-icon" aria-hidden="true">
        <IconSvg name="arrow-move-right" variant="line" />
      </span>
    </span>
  </button>
</li>

<style>
  .list-item {
    margin: 0;
    padding: 0;
  }

  .row-card {
    display: flex;
    align-items: center;
    gap: var(--pd-md);
    width: 100%;
    min-width: 0;
    padding: var(--pd-sm) var(--pd-lg) var(--pd-sm) var(--pd-sm);
    border-radius: calc(var(--radius-lg) + var(--pd-sm));
    border: none;
    background: var(--ghost-bg);
    color: var(--print-highlight);
    text-align: left;
    user-select: none;
    transition:
      background var(--motion-effects-fast-duration) var(--motion-effects-fast-easing),
      transform var(--motion-effects-fast-duration) var(--motion-effects-fast-easing),
      color var(--motion-effects-fast-duration) var(--motion-effects-fast-easing),
      box-shadow var(--motion-effects-fast-duration) var(--motion-effects-fast-easing);
  }

  button.row-card {
    appearance: none;
    margin: 0;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    box-sizing: border-box;

    &:disabled {
      opacity: var(--opacity-disabled);
      cursor: not-allowed;
      pointer-events: none;
    }
  }

  @media (hover: hover) {
    .row-card:hover:not(:disabled) {
      transform: translateX(0.1875rem);
      background: var(--ghost-bg-hover);
      color: var(--print-light);
    }

    .row-card:hover:not(:disabled) .preset-open-icon {
      color: inherit;
    }

    button.preset-row:hover:not(:disabled) .preset-open-icon :global(svg) {
      transform: translateX(0.25rem);
    }
  }

  button.preset-row:active:not(:disabled) .preset-open-icon :global(svg) {
    transform: translateX(0.375rem);
  }

  .preset-row {
    flex-wrap: wrap;
  }

  .preset-open-hit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: var(--size-md);
    height: var(--size-sm);
    min-width: var(--size-md);
    border-radius: var(--radius-md);
    margin-left: auto;
  }

  .preset-open-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--print-subtle);
    opacity: 0.9;
    transition: color var(--motion-effects-fast-duration) var(--motion-effects-fast-easing);
  }

  .preset-open-icon :global(svg) {
    width: 1.125rem;
    height: 1.125rem;
    min-width: 1.125rem;
    min-height: 1.125rem;
    transition: transform var(--motion-effects-fast-duration) var(--motion-effects-fast-easing);
  }

  .preset-name {
    flex: 1;
    min-width: 8rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--text-sm);
    font-weight: 400;
  }

  .name {
    font-size: var(--text-sm);
    font-weight: 500;
  }

  .icon-box {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    flex-shrink: 0;
    z-index: 1;
    width: var(--size-lg);
    height: var(--size-lg);
    padding: var(--pd-md);
    border-radius: var(--radius-lg);
    background: var(--node-icon-box-bg-default);
    box-shadow: 0 0 0 1px var(--color-gray-20);
  }

  .icon-box :global(svg) {
    width: 100%;
    height: 100%;
    color: var(--node-icon-box-color-default, var(--color-gray-120));
  }

  .icon-box[data-category='audio'],
  .row-card[data-category='audio'] .icon-box {
    background: var(--color-blue-70);
  }
  .icon-box[data-category='effects'],
  .row-card[data-category='effects'] .icon-box {
    background: var(--color-orange-red-gray-60);
  }
  .icon-box[data-category='sdf'],
  .row-card[data-category='sdf'] .icon-box {
    background: var(--color-gray-100);
  }

  .row-card[data-category='audio'] .icon-box :global(svg) {
    color: var(--color-blue-120);
  }
  .row-card[data-category='effects'] .icon-box :global(svg) {
    color: var(--color-orange-red-120);
  }
  .row-card[data-category='sdf'] .icon-box :global(svg) {
    color: var(--color-blue-gray-60);
  }
</style>
