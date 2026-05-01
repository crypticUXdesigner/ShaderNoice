<script lang="ts">
  import type { NodeSpec } from '../../../types/nodeSpec';
  import { NodeIconSvg } from '../ui';
  import { getNodeIcon } from '../../../utils/nodeSpecUtils';
  import {
    getCategorySlug,
    isSystemInputNode,
    isStructuredPatternNode,
    isDerivedShapeNode,
    isWarpDistortNode,
    isFunctionsMathNode,
    isAdvancedMathNode,
    isStylizeEffectsNode,
    isSdfRaymarcherNode,
  } from '../../../utils/cssTokens';

  interface Props {
    spec: NodeSpec;
    isActive: boolean;
    hasDocs: boolean;
    onActivate?: () => void;
  }

  let { spec, isActive, hasDocs, onActivate }: Props = $props();

  const categorySlug = $derived(getCategorySlug(spec.category));
  const variantClasses = $derived(
    [
      isSystemInputNode(spec.id, spec.category) ? 'system-input' : '',
      isStructuredPatternNode(spec.id, spec.category) ? 'structured' : '',
      isDerivedShapeNode(spec.id, spec.category) ? 'derived' : '',
      isWarpDistortNode(spec.id, spec.category) ? 'warp' : '',
      isFunctionsMathNode(spec.id, spec.category) ? 'functions' : '',
      isAdvancedMathNode(spec.id, spec.category) ? 'advanced' : '',
      isStylizeEffectsNode(spec.id, spec.category) ? 'stylize' : '',
      isSdfRaymarcherNode(spec.id, spec.category) ? 'raymarcher' : '',
    ]
      .filter(Boolean)
      .join(' ')
  );

  function handleActivate() {
    onActivate?.();
  }
</script>

<button
  type="button"
  class="docs-panel-item {variantClasses}"
  class:is-active={isActive}
  onclick={handleActivate}
  title={spec.displayName}
  data-category={categorySlug}
>
  <div class="icon-box" data-category={categorySlug}>
    <NodeIconSvg identifier={getNodeIcon(spec)} />
  </div>
  <span class="name">{spec.displayName}</span>
  {#if !hasDocs}
    <span class="badge" title="No documentation yet">Missing</span>
  {/if}
</button>

<style>
  .docs-panel-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--pd-md);
    padding: var(--pd-sm);
    border-radius: calc(var(--radius-lg) + var(--pd-sm));
    background: var(--ghost-bg);
    color: var(--print-highlight);
    text-align: left;
    cursor: default;
    user-select: none;
    transition: background 0.15s, transform 0.15s, color 0.15s;
  }

  .docs-panel-item:hover {
    transform: translateX(var(--pd-2xs));
    background: var(--ghost-bg-hover);
    color: var(--print-light);
  }

  .docs-panel-item.is-active {
    background: var(--ghost-bg-active);
    color: var(--color-blue-110);
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
  }

  .icon-box :global(svg) {
    width: 100%;
    height: 100%;
    color: var(--node-icon-box-color-default, var(--color-gray-120));
  }

  .name {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: var(--text-sm);
  }

  .badge {
    flex-shrink: 0;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    font-size: var(--text-xs);
    font-weight: 700;
    background: var(--ghost-bg);
    color: var(--print-subtle);
  }

  /* Category: icon-box background (adapted from NodePanelItem list mode) */
  .docs-panel-item .icon-box[data-category="inputs"] { background: var(--node-icon-box-bg-inputs); }
  .docs-panel-item.system-input .icon-box[data-category="inputs"] { background: var(--node-icon-box-bg-inputs-system); }
  .docs-panel-item .icon-box[data-category="patterns"] { background: var(--node-icon-box-bg-patterns); }
  .docs-panel-item.structured .icon-box[data-category="patterns"] { background: var(--node-icon-box-bg-patterns-structured); }
  .docs-panel-item .icon-box[data-category="shapes"] { background: var(--node-icon-box-bg-shapes); }
  .docs-panel-item.derived .icon-box[data-category="shapes"] { background: var(--node-icon-box-bg-shapes-derived); }
  .docs-panel-item .icon-box[data-category="math"] { background: var(--node-icon-box-bg-math); }
  .docs-panel-item.functions .icon-box[data-category="math"] { background: var(--node-icon-box-bg-math-functions); }
  .docs-panel-item.advanced .icon-box[data-category="math"] { background: var(--node-icon-box-bg-math-advanced); }
  .docs-panel-item .icon-box[data-category="utilities"] { background: var(--node-icon-box-bg-utilities); }
  .docs-panel-item .icon-box[data-category="distort"] { background: var(--node-icon-box-bg-distort); }
  .docs-panel-item.warp .icon-box[data-category="distort"] { background: var(--node-icon-box-bg-distort-warp); }
  .docs-panel-item .icon-box[data-category="blend"] { background: var(--node-icon-box-bg-blend); }
  .docs-panel-item .icon-box[data-category="mask"] { background: var(--node-icon-box-bg-mask); }
  .docs-panel-item .icon-box[data-category="effects"] { background: var(--node-icon-box-bg-effects); }
  .docs-panel-item.stylize .icon-box[data-category="effects"] { background: var(--node-icon-box-bg-effects-stylize); }
  .docs-panel-item .icon-box[data-category="output"] { background: var(--node-icon-box-bg-output); }
  .docs-panel-item .icon-box[data-category="audio"] { background: var(--node-icon-box-bg-audio); }
  .docs-panel-item .icon-box[data-category="sdf"] { background: var(--node-icon-box-bg-sdf); }

  /* Category: icon color (adapted from NodePanelItem) */
  .docs-panel-item[data-category="inputs"] .icon-box :global(svg) { color: var(--node-icon-box-color-inputs); }
  .docs-panel-item.system-input[data-category="inputs"] .icon-box :global(svg) { color: var(--node-icon-box-color-inputs-system); }
  .docs-panel-item[data-category="patterns"] .icon-box :global(svg) { color: var(--node-icon-box-color-patterns); }
  .docs-panel-item.structured[data-category="patterns"] .icon-box :global(svg) { color: var(--node-icon-box-color-patterns-structured); }
  .docs-panel-item[data-category="shapes"] .icon-box :global(svg) { color: var(--node-icon-box-color-shapes); }
  .docs-panel-item.derived[data-category="shapes"] .icon-box :global(svg) { color: var(--node-icon-box-color-shapes-derived); }
  .docs-panel-item[data-category="math"] .icon-box :global(svg) { color: var(--node-icon-box-color-math); }
  .docs-panel-item.functions[data-category="math"] .icon-box :global(svg) { color: var(--node-icon-box-color-math-functions); }
  .docs-panel-item.advanced[data-category="math"] .icon-box :global(svg) { color: var(--node-icon-box-color-math-advanced); }
  .docs-panel-item[data-category="utilities"] .icon-box :global(svg) { color: var(--node-icon-box-color-utilities); }
  .docs-panel-item[data-category="distort"] .icon-box :global(svg) { color: var(--node-icon-box-color-distort); }
  .docs-panel-item.warp[data-category="distort"] .icon-box :global(svg) { color: var(--node-icon-box-color-distort-warp); }
  .docs-panel-item[data-category="blend"] .icon-box :global(svg) { color: var(--node-icon-box-color-blend); }
  .docs-panel-item[data-category="mask"] .icon-box :global(svg) { color: var(--node-icon-box-color-mask); }
  .docs-panel-item[data-category="effects"] .icon-box :global(svg) { color: var(--node-icon-box-color-effects); }
  .docs-panel-item.stylize[data-category="effects"] .icon-box :global(svg) { color: var(--node-icon-box-color-effects-stylize); }
  .docs-panel-item[data-category="output"] .icon-box :global(svg) { color: var(--node-icon-box-color-output); }
  .docs-panel-item[data-category="audio"] .icon-box :global(svg) { color: var(--node-icon-box-color-audio); }
  .docs-panel-item[data-category="sdf"] .icon-box :global(svg) { color: var(--node-icon-box-color-sdf); }
</style>

