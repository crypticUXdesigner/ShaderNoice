<script lang="ts">
  /**
   * Audio driver panel — overview: band nav selects one (or all) bands; main column edits
   * band analysis (spectrum, mode, timing) and remaps (Connect on card).
   */
  import { Button, IconSvg, EditableLabel } from '../ui';
  import DriverPanelEmptyState from './DriverPanelEmptyState.svelte';
  import RemapperCard from '../audio/RemapperCard.svelte';
  import FrequencyRangeEditor from '../audio/FrequencyRangeEditor.svelte';
  import type { AudioDriverPanelProps } from './AudioSignalPicker.types';
  import {
    getPrimaryFileId,
    type AudioBandEntry,
    type AudioRemapperEntry,
  } from '../../../data-model/audioSetupTypes';
  import {
    updateAudioBand,
    addAudioRemapper,
    updateAudioRemapper,
    removeAudioBand,
    removeAudioRemapper,
    createDuplicateRemapperEntry,
    generateUUID,
  } from '../../../data-model';
  import { getVirtualNodeId } from '../../../utils/virtualNodes';
  import { getRemapperParameterConnections } from '../../../utils/getRemapperParameterConnections';
  import { resolveDriverConnectionTargetDisplay } from './driverTargetDisplay';
  import { confirmDeleteDriverAsset } from '../../../utils/confirmDriverAssetDelete';
  import { subscribeParameterValueTick } from '../../stores/parameterValueTickStore';
  import type { Action } from 'svelte/action';

  const ALL_BANDS = Symbol('allBands');

  let {
    targetNodeId,
    targetParameter,
    graph,
    nodeSpecs,
    audioSetup,
    onSelect,
    onAudioSetupChange,
    getAudioManager,
    initialBandId,
    focusRemapperId,
    connectionId,
    registerDeleteHandler,
    onRevealInNodeEditor,
    onNewBand,
  }: AudioDriverPanelProps = $props();

  let activeNavBandId = $state<string | typeof ALL_BANDS | null>(null);
  let sectionRefs = $state<Map<string, HTMLElement>>(new Map());
  let remapperRefs = $state<Map<string, HTMLElement>>(new Map());
  let didInitialScroll = $state(false);

  let spectrumDataByBand = $state<Map<string, { frequencyData: Uint8Array; fftSize: number; sampleRate: number }>>(new Map());
  let liveValuesByRemapper = $state<Map<string, { incoming: number | null; outgoing: number | null }>>(new Map());

  const LIVE_UPDATE_INTERVAL_MS = 50;

  const bands = $derived(audioSetup.bands);
  const remappers = $derived(audioSetup.remappers);
  const canCreateBand = $derived(Boolean(getPrimaryFileId(audioSetup)));

  /** Oldest band first (storage prepends new bands). */
  const navBands = $derived([...bands].reverse());

  const remappersByBand = $derived.by(() => {
    const map = new Map<string, AudioRemapperEntry[]>();
    for (const band of bands) {
      map.set(band.id, remappers.filter((r) => r.bandId === band.id));
    }
    return map;
  });

  const visibleSections = $derived.by(() => {
    if (activeNavBandId === ALL_BANDS) return navBands;
    if (typeof activeNavBandId === 'string') {
      return bands.filter((b) => b.id === activeNavBandId);
    }
    return bands.length > 0 ? [bands[0]!] : [];
  });

  $effect(() => {
    const list = bands;
    if (activeNavBandId === ALL_BANDS) return;
    if (typeof activeNavBandId === 'string' && list.some((b) => b.id === activeNavBandId)) return;
    if (list.length === 0) {
      activeNavBandId = null;
      return;
    }
    activeNavBandId = list[0]!.id;
  });

  $effect(() => {
    const setup = audioSetup;
    const am = getAudioManager?.();
    if (!am || typeof am.getAnalyzerSpectrumData !== 'function') return;
    let lastUpdateTime = 0;
    const specMap = new Map<string, { frequencyData: Uint8Array; fftSize: number; sampleRate: number }>();
    const liveMap = new Map<string, { incoming: number | null; outgoing: number | null }>();
    const unsub = subscribeParameterValueTick(() => {
      specMap.clear();
      liveMap.clear();
      for (const band of setup.bands) {
        const spec = am.getAnalyzerSpectrumData(band.id);
        if (spec) specMap.set(band.id, spec);
        for (const remap of setup.remappers.filter((r) => r.bandId === band.id)) {
          const live = am.getPanelBandLiveValues?.(band.id, {
            inMin: remap.inMin,
            inMax: remap.inMax,
            outMin: remap.outMin,
            outMax: remap.outMax,
          });
          if (live) liveMap.set(remap.id, live);
        }
      }
      const now = performance.now();
      if (now - lastUpdateTime >= LIVE_UPDATE_INTERVAL_MS) {
        lastUpdateTime = now;
        spectrumDataByBand = new Map(specMap);
        liveValuesByRemapper = new Map(liveMap);
      }
    });
    return unsub;
  });

  $effect(() => {
    if (didInitialScroll) return;
    const remapperId = focusRemapperId;
    const bandId = initialBandId;
    if (remapperId) {
      const remapper = remappers.find((r) => r.id === remapperId);
      if (remapper) {
        activeNavBandId = remapper.bandId;
        queueMicrotask(() => scrollToRemapper(remapperId));
        didInitialScroll = true;
        return;
      }
    }
    if (bandId && bands.some((b) => b.id === bandId)) {
      activeNavBandId = bandId;
      queueMicrotask(() => scrollToBand(bandId));
      didInitialScroll = true;
    }
  });

  function scrollToBand(bandId: string) {
    sectionRefs.get(bandId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function scrollToRemapper(remapperId: string) {
    remapperRefs.get(remapperId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function selectNavBand(bandId: string | typeof ALL_BANDS) {
    activeNavBandId = bandId;
    if (bandId !== ALL_BANDS) {
      scrollToBand(bandId);
    }
  }

  function handleBandChange(bandId: string, updater: (b: AudioBandEntry) => AudioBandEntry) {
    onAudioSetupChange?.(updateAudioBand(audioSetup, bandId, updater));
  }

  function handleAddRemapper(bandId: string) {
    const bandRemappers = remappersByBand.get(bandId) ?? [];
    const newRemapper: AudioRemapperEntry = {
      id: `remap-${generateUUID()}`,
      name: `Remap ${bandRemappers.length + 1}`,
      bandId,
      inMin: 0,
      inMax: 1,
      outMin: 0,
      outMax: 1,
    };
    onAudioSetupChange?.(addAudioRemapper(audioSetup, newRemapper));
  }

  function handleRemapperChange(remapperId: string, updater: (r: AudioRemapperEntry) => AudioRemapperEntry) {
    onAudioSetupChange?.(updateAudioRemapper(audioSetup, remapperId, updater));
  }

  function handleDuplicateRemapper(remapper: AudioRemapperEntry) {
    const newId = `remap-${generateUUID()}`;
    const existingNames = audioSetup.remappers
      .filter((r) => r.bandId === remapper.bandId)
      .map((r) => r.name);
    const duplicate = createDuplicateRemapperEntry(remapper, newId, existingNames);
    onAudioSetupChange?.(addAudioRemapper(audioSetup, duplicate));
  }

  function handleConnectRemapper(remapperId: string) {
    const virtualNodeId = getVirtualNodeId(`remap-${remapperId}`);
    onSelect?.({ type: 'audio', virtualNodeId });
  }

  function handleDisconnect() {
    if (!connectionId) return;
    onSelect?.({ type: 'disconnect', connectionId });
  }

  function isRemapperConnectedToTarget(remapperId: string): boolean {
    return focusRemapperId === remapperId;
  }

  function tryDeleteRemapper(remapperId: string): boolean {
    const connectionCount = getRemapperParameterConnections(graph, remapperId, nodeSpecs).length;
    if (!confirmDeleteDriverAsset({ assetKind: 'remapper', connectionCount })) {
      return false;
    }
    onAudioSetupChange?.(removeAudioRemapper(audioSetup, remapperId));
    return true;
  }

  function deleteSelected() {
    if (activeNavBandId === ALL_BANDS || typeof activeNavBandId !== 'string') return;
    const deletedId = activeNavBandId;
    const next = removeAudioBand(audioSetup, deletedId);
    if (next === audioSetup) return;
    onAudioSetupChange?.(next);
    const remaining = next.bands;
    activeNavBandId = remaining.find((b) => b.id !== deletedId)?.id ?? remaining[0]?.id ?? null;
  }

  const INPUT_LIKE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

  const registerDeleteBridge: Action<
    HTMLDivElement,
    {
      register: NonNullable<AudioDriverPanelProps['registerDeleteHandler']> | undefined;
      getDelete: () => () => void;
    }
  > = (_node, init) => {
    let lastReg = init.register;
    init.register?.(init.getDelete());
    return {
      update(next) {
        lastReg = next.register;
        next.register?.(next.getDelete());
      },
      destroy() {
        lastReg?.(null);
      },
    };
  };

  const docDeleteCapture: Action<HTMLDivElement, undefined> = (root) => {
    function onDocKeydown(e: KeyboardEvent) {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const target = e.target instanceof Node ? e.target : null;
      if (!target || !root.contains(target)) return;
      if (target instanceof Element && target.closest(INPUT_LIKE_SELECTOR)) return;
      deleteSelected();
      e.preventDefault();
      e.stopPropagation();
    }
    document.addEventListener('keydown', onDocKeydown, true);
    return {
      destroy() {
        document.removeEventListener('keydown', onDocKeydown, true);
      },
    };
  };

  const setSectionRef: Action<HTMLElement, string> = (node, bandId) => {
    sectionRefs.set(bandId, node);
    return {
      update(nextBandId) {
        if (nextBandId !== bandId) {
          sectionRefs.delete(bandId);
          bandId = nextBandId;
        }
        sectionRefs.set(bandId, node);
      },
      destroy() {
        sectionRefs.delete(bandId);
      },
    };
  };

  const setRemapperRef: Action<HTMLElement, string> = (node, remapperId) => {
    remapperRefs.set(remapperId, node);
    return {
      update(nextId) {
        if (nextId !== remapperId) {
          remapperRefs.delete(remapperId);
          remapperId = nextId;
        }
        remapperRefs.set(remapperId, node);
      },
      destroy() {
        remapperRefs.delete(remapperId);
      },
    };
  };
</script>

<div
  class="audio-driver-panel"
  role="group"
  aria-label="Audio driver configuration"
  use:registerDeleteBridge={{ register: registerDeleteHandler, getDelete: () => deleteSelected }}
  use:docDeleteCapture
>
  <nav class="band-nav scrollbar-styled" aria-label="Bands">
    <Button
      variant="primary"
      size="sm"
      mode="both"
      class="nav-add"
      disabled={!canCreateBand}
      title={canCreateBand ? 'New' : 'Set a primary audio source first'}
      aria-label={canCreateBand ? 'New' : 'Set a primary audio source first'}
      onclick={() => onNewBand?.()}
    >
      <IconSvg name="plus" variant="line" />
      New
    </Button>
    {#if bands.length > 0}
      <button
        type="button"
        class="nav-item"
        class:is-active={activeNavBandId === ALL_BANDS}
        onclick={() => selectNavBand(ALL_BANDS)}
      >
        All bands
      </button>
      {#each navBands as band (band.id)}
        <button
          type="button"
          class="nav-item"
          class:is-active={activeNavBandId === band.id}
          onclick={() => selectNavBand(band.id)}
          title={band.name}
        >
          {band.name}
        </button>
      {/each}
    {/if}
  </nav>

  <div class="sections scrollbar-styled" role="region" aria-label="Band sections">
    {#if bands.length === 0}
      <DriverPanelEmptyState
        icon="waveform"
        driverKind="audio"
        title={canCreateBand ? 'No audio drivers yet' : 'No audio source'}
        copy={canCreateBand
          ? 'Create a band, add a remap in the main column, then use Connect on the remap card to drive this parameter.'
          : 'Choose a playlist track or upload audio as the primary source, then create bands here.'}
        secondaryHint={canCreateBand ? undefined : 'Available once a primary audio source is set.'}
        spacious
      >
        {#snippet primaryAction()}
          <Button
            variant="primary"
            size="md"
            mode="both"
            disabled={!canCreateBand}
            title={canCreateBand ? 'New' : 'Set a primary audio source first'}
            aria-label={canCreateBand ? 'New' : 'Set a primary audio source first'}
            onclick={() => onNewBand?.()}
          >
            <IconSvg name="plus" variant="line" />
            New
          </Button>
        {/snippet}
      </DriverPanelEmptyState>
    {:else}
      {#each visibleSections as band (band.id)}
        {@const bandRemappers = remappersByBand.get(band.id) ?? []}
        <section
          class="band-section frame-elevated"
          aria-labelledby="band-heading-{band.id}"
          use:setSectionRef={band.id}
        >
          <header class="section-header" id="band-heading-{band.id}">
            <EditableLabel
              value={band.name}
              placeholder="Band name"
              ariaLabel="Band name"
              onCommit={(value) => handleBandChange(band.id, (b) => ({ ...b, name: value }))}
            />
            <Button
              variant="ghost"
              size="sm"
              mode="icon-only"
              title="Delete band"
              aria-label={`Delete band: ${band.name}`}
              onclick={() => {
                onAudioSetupChange?.(removeAudioBand(audioSetup, band.id));
                if (activeNavBandId === band.id) {
                  const remaining = bands.filter((b) => b.id !== band.id);
                  activeNavBandId = remaining[0]?.id ?? null;
                }
              }}
            >
              <IconSvg name="trash" variant="line" />
            </Button>
          </header>

          <div class="frequency-wrap">
            <FrequencyRangeEditor
              frequencyBands={band.frequencyBands}
              spectrumData={spectrumDataByBand.get(band.id)?.frequencyData}
              sampleRate={spectrumDataByBand.get(band.id)?.sampleRate ?? 44100}
              fftSize={band.fftSize}
              fftSizeValue={band.fftSize}
              bandMode={band.bandMode ?? 'mean'}
              attackHalfLifeSeconds={band.attackHalfLifeSeconds}
              releaseHalfLifeSeconds={band.releaseHalfLifeSeconds}
              onChange={(bands) => handleBandChange(band.id, (b) => ({ ...b, frequencyBands: bands }))}
              onBandModeChange={(mode) => handleBandChange(band.id, (b) => ({ ...b, bandMode: mode }))}
              onAttackHalfLifeSecondsChange={(v) =>
                handleBandChange(band.id, (b) => ({
                  ...b,
                  attackHalfLifeSeconds: v != null ? Math.max(0, v) : undefined,
                }))}
              onReleaseHalfLifeSecondsChange={(v) =>
                handleBandChange(band.id, (b) => ({
                  ...b,
                  releaseHalfLifeSeconds: v != null ? Math.max(0, v) : undefined,
                }))}
              onFftSizeChange={(v) =>
                handleBandChange(band.id, (b) => ({
                  ...b,
                  fftSize: Math.max(256, Math.min(8192, Math.round(v / 256) * 256)),
                }))}
            />
          </div>

          <div class="remappers-header">
            <span class="remappers-label">Remaps</span>
            <Button variant="ghost" size="sm" mode="both" onclick={() => handleAddRemapper(band.id)}>
              <IconSvg name="plus" variant="line" />
              Add remap
            </Button>
          </div>

          {#if bandRemappers.length === 0}
            <p class="remappers-empty">No remaps yet. Add one, then connect it to this parameter.</p>
          {:else}
            <div class="remappers-list" role="list" aria-label="Remaps for {band.name}">
              {#each bandRemappers as remapper (remapper.id)}
                {@const connected = isRemapperConnectedToTarget(remapper.id)}
                {@const connectionTargets = getRemapperParameterConnections(graph, remapper.id, nodeSpecs)
                  .map((c) => resolveDriverConnectionTargetDisplay(graph, nodeSpecs, c.nodeId, c.paramName))
                  .filter((t): t is NonNullable<typeof t> => t != null)}
                <div use:setRemapperRef={remapper.id}>
                  <RemapperCard
                    remapper={remapper}
                    bandName={band.name}
                    isConnectedToTarget={connected}
                    liveValues={liveValuesByRemapper.get(remapper.id) ?? null}
                    onConnect={connected ? undefined : () => handleConnectRemapper(remapper.id)}
                    onDisconnect={connected ? handleDisconnect : undefined}
                    onDelete={() => {
                      tryDeleteRemapper(remapper.id);
                    }}
                    onDuplicate={() => handleDuplicateRemapper(remapper)}
                    onRemapperChange={(updater) => handleRemapperChange(remapper.id, updater)}
                    {connectionTargets}
                    activeTargetNodeId={targetNodeId}
                    activeTargetParamName={targetParameter}
                    onRevealParameter={onRevealInNodeEditor}
                  />
                </div>
              {/each}
            </div>
          {/if}
        </section>
      {/each}
    {/if}
  </div>
</div>

<style>
  .audio-driver-panel {
    display: grid;
    grid-template-columns: minmax(120px, 148px) minmax(0, 1fr);
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .band-nav {
    display: flex;
    flex-direction: column;
    gap: var(--pd-2xs);
    flex: 1;
    min-height: 0;
    padding: var(--pd-sm);
    border-right: 1px solid var(--color-gray-50);
    background: var(--color-gray-20);
    overflow-y: auto;
    min-height: 0;

    :global(.nav-add.button.primary.sm) {
      width: 100%;
      justify-content: center;
      margin-block: var(--pd-sm);
    }

    .nav-item {
      display: block;
      width: 100%;
      padding: var(--pd-xs) var(--pd-sm);
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-gray-110);
      font-size: var(--text-sm);
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      &:hover {
        background: var(--color-gray-30);
      }

      &.is-active {
        background: var(--color-gray-40);
        border-color: var(--color-gray-60);
        color: var(--color-gray-130);
      }
    }
  }

  .sections {
    display: flex;
    flex-direction: column;
    gap: var(--pd-sm);
    padding: var(--pd-sm);
    overflow-y: auto;
    min-height: 0;
    background: var(--color-gray-30);
  }

  .band-section {
    display: flex;
    flex-direction: column;
    gap: var(--pd-xs);
    padding: var(--pd-sm);
    background: var(--color-gray-60);
    border-radius: var(--radius-md);
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: var(--pd-sm);
    padding-bottom: var(--pd-2xs);
    border-bottom: 1px solid var(--color-gray-70);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-gray-120);
  }

  .frequency-wrap {
    width: 100%;
  }

  .remappers-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--pd-sm);
    padding-top: var(--pd-xs);
    padding-inline: var(--pd-sm);
    border-top: 1px solid var(--color-gray-70);

    .remappers-label {
      font-size: var(--text-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-gray-110);
    }
  }

  .remappers-empty {
    margin: 0;
    padding-inline: var(--pd-sm);
    font-size: var(--text-sm);
    color: var(--color-gray-100);
  }

  .remappers-list {
    display: flex;
    flex-direction: column;
    gap: var(--pd-sm);
  }
</style>
