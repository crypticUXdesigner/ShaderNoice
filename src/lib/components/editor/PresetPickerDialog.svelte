<script lang="ts">
  import { Button, IconSvg, ModalDialog, SearchInput } from '../ui';
  import type { IconName } from '../../../utils/iconsUiRegistry';

  type PresetInfo = { name: string; displayName: string };

  interface Props {
    open: boolean;
    presetList: PresetInfo[];
    selectedPreset?: string | null;
    presetLoading?: boolean;
    onClose: () => void;
    onSelectPreset: (presetName: string) => void;
    onImportFromFile: () => void;
  }

  let {
    open,
    presetList,
    selectedPreset = null,
    presetLoading = false,
    onClose,
    onSelectPreset,
    onImportFromFile,
  }: Props = $props();

  let searchQuery = $state('');

  type PresetCategoryId = 'demos' | 'idle' | 'tests';

  const presetCategoryByName: Partial<Record<string, PresetCategoryId>> = {
    // Demos (often audio-reactive / track assignment)
    'sphere': 'demos',
    'living-speaker': 'demos',

    // Idle animations (solid, ready-to-run)
    'drive-home-lights': 'idle',
    'glass-shell': 'idle',
    'warped-drops': 'idle',
    'swirly-whirly': 'idle',
    'inflated-icosahedron': 'idle',
    'bloom-sphere': 'idle',
    'bokeh-point': 'idle',
    'hex-voxel': 'idle',
    'hex-prism-sdf': 'idle',
    'vector-field-noise': 'idle',

    // Early tests / scratch
    'sdf-raymarcher-hex-audio': 'tests',
    'sdf-raymarcher-ether-audio': 'tests',
    'new': 'tests',
    'testing': 'tests',
    'weird': 'tests',
  };

  const presetIconByName: Partial<Record<string, IconName>> = {
    // Audio / demos
    'living-speaker': 'waveform',
    'drive-home-lights': 'photo',
    'sdf-raymarcher-hex-audio': 'wave-sine',
    'sdf-raymarcher-ether-audio': 'sparkles',

    // Idle animations
    'glass-shell': 'sparkles',
    'warped-drops': 'wave-sine',
    'swirly-whirly': 'curly-loop',
    'inflated-icosahedron': 'grid-pattern',
    'bloom-sphere': 'flame',
    'bokeh-point': 'photo',
    'hex-voxel': 'grid-pattern',
    'hex-prism-sdf': 'matrix',
    'sphere': 'sparkles',
    'vector-field-noise': 'matrix',

    // Tests
    'new': 'plus',
    'testing': 'warning',
    'weird': 'multiply',
  };

  interface PresetCategory {
    id: PresetCategoryId;
    label: string;
  }

  const categories: PresetCategory[] = [
    { id: 'demos', label: 'Demos' },
    { id: 'idle', label: 'Idle animations' },
    { id: 'tests', label: 'Early tests' },
  ];

  function resolveCategory(p: PresetInfo): PresetCategoryId {
    return presetCategoryByName[p.name] ?? 'idle';
  }

  type ChipCategorySlug = 'audio' | 'effects' | 'sdf';

  function resolveChipCategory(p: PresetInfo): ChipCategorySlug {
    const c = resolveCategory(p);
    if (c === 'demos') return 'audio';
    if (c === 'tests') return 'sdf';
    return 'effects';
  }

  function resolveIcon(p: PresetInfo): IconName {
    return presetIconByName[p.name] ?? 'preset';
  }

  function normalize(s: string): string {
    return s.toLowerCase().trim();
  }

  const presetsByCategory = $derived.by(() => {
    const buckets: Record<PresetCategoryId, PresetInfo[]> = { demos: [], idle: [], tests: [] };
    for (const p of presetList) buckets[resolveCategory(p)].push(p);
    // Keep stable, predictable order within category
    for (const key of Object.keys(buckets) as PresetCategoryId[]) {
      buckets[key].sort((a, b) => a.displayName.localeCompare(b.displayName));
    }
    return buckets;
  });

  const filteredPresetsByCategory = $derived.by(() => {
    const q = normalize(searchQuery);
    if (q === '') return presetsByCategory;
    const buckets: Record<PresetCategoryId, PresetInfo[]> = { demos: [], idle: [], tests: [] };
    for (const p of presetList) {
      const matches =
        normalize(p.displayName).includes(q) ||
        normalize(p.name).includes(q);
      if (!matches) continue;
      buckets[resolveCategory(p)].push(p);
    }
    for (const key of Object.keys(buckets) as PresetCategoryId[]) {
      buckets[key].sort((a, b) => a.displayName.localeCompare(b.displayName));
    }
    return buckets;
  });

  const totalFilteredCount = $derived.by(() => {
    const b = filteredPresetsByCategory;
    return b.demos.length + b.idle.length + b.tests.length;
  });

  function handleClose(): void {
    searchQuery = '';
    onClose();
  }
</script>

{#snippet searchTopbar()}
  <div class="search">
    <SearchInput
      variant="primary"
      size="sm"
      bind:value={searchQuery}
      placeholder="Search presets..."
      class="menu-input"
      ariaLabel="Search presets"
      disabled={presetLoading}
    />
  </div>
{/snippet}

<ModalDialog
  {open}
  onClose={handleClose}
  variant="list"
  title="Load Preset"
  class="preset-picker-dialog"
  bodyClass="preset-picker-body"
  bodyScroll="content"
  bodyTopbar={searchTopbar}
>
  {#snippet footer()}
    <div class="footer">
      <div class="left">
        <Button
          variant="ghost"
          size="sm"
          mode="both"
          disabled={presetLoading}
          onclick={() => onImportFromFile()}
        >
          <IconSvg name="download-simple" variant="line" />
          Import…
        </Button>
      </div>
      <div class="right">
        <Button variant="primary" size="sm" onclick={() => handleClose()} disabled={presetLoading}>
          Done
        </Button>
      </div>
    </div>
  {/snippet}

  {#if presetList.length === 0}
    <p class="empty">No presets available.</p>
  {:else if totalFilteredCount === 0}
    <p class="empty">No presets match “{searchQuery.trim()}”.</p>
  {:else}
    <div class="content">
      {#each categories as c (c.id)}
        {@const items = filteredPresetsByCategory[c.id]}
        {#if items.length > 0}
          <section class="section">
            <div class="headline">
              <h3 class="headline-text">{c.label}</h3>
            </div>
            <ul class="list" aria-label={c.label}>
              {#each items as p (p.name)}
                {@const chipCategory = resolveChipCategory(p)}
                <li class="list-item">
                  <button
                    type="button"
                    class="card"
                    class:is-selected={selectedPreset === p.name}
                    disabled={presetLoading}
                    onclick={() => onSelectPreset(p.name)}
                    aria-label={`Load preset: ${p.displayName}`}
                    data-category={chipCategory}
                  >
                    <span class="icon-box" data-category={chipCategory} aria-hidden="true">
                      <IconSvg name={resolveIcon(p)} variant="filled" />
                    </span>
                    <span class="name">{p.displayName}</span>
                  </button>
                </li>
              {/each}
            </ul>
          </section>
        {/if}
      {/each}
    </div>
  {/if}
</ModalDialog>

<style>
  :global(.preset-picker-body) {
    padding: 0;
    gap: var(--pd-lg);
  }

  :global(.preset-picker-body .modal-dialog-topbar) {
    padding: var(--pd-md) var(--pd-lg);
  }

  :global(.preset-picker-body .modal-dialog-scroll) {
    padding: var(--pd-lg);
  }

  .empty {
    margin: 0;
    font-size: var(--text-md);
    color: var(--text-muted, var(--color-gray-100));
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: var(--pd-xl);
    flex: 1;
    min-height: 0;
  }

  .search {
    position: relative;
    width: 100%;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: var(--pd-md);
  }

  .headline {
    display: flex;
    align-items: center;
    gap: var(--pd-md);
    margin: 0;
    padding: 0 0 0 var(--pd-sm);
  }

  .headline-text {
    margin: 0;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-gray-110);
    letter-spacing: 0.2px;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: var(--pd-xs);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .list-item {
    margin: 0;
    padding: 0;
  }

  .card {
    display: flex;
    align-items: center;
    gap: var(--pd-md);
    width: 100%;
    min-width: 0;
    padding: var(--pd-sm);
    border-radius: calc(var(--radius-lg) + var(--pd-sm));
    border: none;
    background: var(--ghost-bg);
    color: var(--print-highlight);
    cursor: pointer;
    text-align: left;
    user-select: none;
    transition: background 0.15s, transform 0.15s, color 0.15s;
  }

  .card:hover:not(:disabled) {
    transform: translateX(var(--pd-2xs));
    background: var(--ghost-bg-hover);
    color: var(--print-light);
  }

  .card:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .card:focus-visible {
    outline: 2px solid var(--color-blue-80);
    outline-offset: 2px;
  }

  .card.is-selected {
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
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--text-sm);
    font-weight: 400;
  }

  /* Category: icon-box background (match DocsPanelItem category chips) */
  .icon-box[data-category="audio"] { background: var(--color-blue-70); }
  .icon-box[data-category="effects"] { background: var(--color-orange-red-gray-60); }
  .icon-box[data-category="sdf"] { background: var(--color-gray-100); }
  /* Category: icon color (match DocsPanelItem category chips) */
  .card[data-category="audio"] .icon-box :global(svg) { color: var(--color-blue-120); }
  .card[data-category="effects"] .icon-box :global(svg) { color: var(--color-orange-red-120); }
  .card[data-category="sdf"] .icon-box :global(svg) { color: var(--color-blue-gray-60); }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--pd-md);
    width: 100%;
  }

  .left,
  .right {
    display: flex;
    align-items: center;
    gap: var(--pd-md);
  }
</style>

