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
    updateConnectionDriverOut,
    removeAudioBand,
    removeAudioRemapper,
    createDuplicateRemapperEntry,
    generateUUID,
  } from '../../../data-model';
  import { getSignalIdFromVirtualNodeId, getVirtualNodeId } from '../../../utils/virtualNodes';
  import { getRemapperParameterConnections } from '../../../utils/getRemapperParameterConnections';
  import { confirmDeleteDriverAsset } from '../../../utils/confirmDriverAssetDelete';
  import {
    applyDriverTargetRange,
    DRIVER_REMAP_DEFAULT_IN,
    connectionDriverOutPatchFromUi,
    resolveConnectionDriverOut,
  } from '../../../utils/driverRemap';
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
    onGraphUpdate,
    getAudioManager,
    initialBandId,
    focusRemapperId,
    connectionId,
    registerDeleteHandler,
    onRevealInNodeEditor,
    onNewBand,
    hasConnectTarget = true,
  }: AudioDriverPanelProps = $props();

  let activeNavBandId = $state<string | typeof ALL_BANDS | null>(null);
  let selectNewestBandOnAdd = $state(false);
  let sectionRefs = $state<Map<string, HTMLElement>>(new Map());
  let remapperRefs = $state<Map<string, HTMLElement>>(new Map());
  let didInitialScroll = $state(false);

  let spectrumDataByBand = $state<Map<string, { frequencyData: Uint8Array; fftSize: number; sampleRate: number }>>(new Map());
  let liveValuesByRemapper = $state<Map<string, { incoming: number | null; gated: number | null }>>(new Map());

  const LIVE_UPDATE_INTERVAL_MS = 50;

  const targetParamSpec = $derived.by(() => {
    const node = graph.nodes.find((n) => n.id === targetNodeId);
    if (!node) return undefined;
    return nodeSpecs.get(node.type)?.parameters?.[targetParameter];
  });

  const driverRemapParamMin = $derived(
    typeof targetParamSpec?.min === 'number' && Number.isFinite(targetParamSpec.min)
      ? targetParamSpec.min
      : undefined
  );
  const driverRemapParamMax = $derived(
    typeof targetParamSpec?.max === 'number' && Number.isFinite(targetParamSpec.max)
      ? targetParamSpec.max
      : undefined
  );
  const driverRemapParamStep = $derived(
    typeof targetParamSpec?.step === 'number' && Number.isFinite(targetParamSpec.step)
      ? targetParamSpec.step
      : undefined
  );
  const driverRemapParamType = $derived(
    targetParamSpec?.type === 'int' || targetParamSpec?.type === 'float'
      ? targetParamSpec.type
      : undefined
  );

  const focusedConnection = $derived.by(() => {
    const conn =
      (connectionId
        ? graph.connections.find((c) => c.id === connectionId)
        : graph.connections.find(
            (c) =>
              !c.disabled &&
              c.targetNodeId === targetNodeId &&
              c.targetParameter === targetParameter
          )) ?? null;
    if (!conn) return null;
    const signalId = getSignalIdFromVirtualNodeId(conn.sourceNodeId);
    return signalId.startsWith('remap-') ? conn : null;
  });

  const focusedConnectionOut = $derived(
    focusedConnection ? resolveConnectionDriverOut(focusedConnection) : { outMin: 0, outMax: 1 }
  );

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
    return navBands;
  });

  $effect(() => {
    const list = bands;
    if (selectNewestBandOnAdd && list.length > 0) {
      selectNewestBandOnAdd = false;
      const newBandId = list[0]!.id;
      activeNavBandId = newBandId;
      queueMicrotask(() => scrollToBand(newBandId));
      return;
    }
    if (activeNavBandId === ALL_BANDS) return;
    if (typeof activeNavBandId === 'string' && list.some((b) => b.id === activeNavBandId)) return;
    if (list.length === 0) {
      activeNavBandId = null;
      return;
    }
    activeNavBandId = ALL_BANDS;
  });

  $effect(() => {
    const setup = audioSetup;
    const am = getAudioManager?.();
    if (!am || typeof am.getAnalyzerSpectrumData !== 'function') return;
    let lastUpdateTime = 0;
    const specMap = new Map<string, { frequencyData: Uint8Array; fftSize: number; sampleRate: number }>();
    const liveMap = new Map<string, { incoming: number | null; gated: number | null }>();
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
            outMin: 0,
            outMax: 1,
          });
          if (live) {
            liveMap.set(remap.id, { incoming: live.incoming, gated: live.outgoing });
          }
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
      queueMicrotask(() => scrollToRemapper(remapperId));
      didInitialScroll = true;
      return;
    }
    if (bandId && bands.some((b) => b.id === bandId)) {
      queueMicrotask(() => scrollToBand(bandId));
      didInitialScroll = true;
    }
  });

  function handleNewBandClick() {
    if (!canCreateBand) return;
    selectNewestBandOnAdd = true;
    onNewBand?.();
  }

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
      inMin: DRIVER_REMAP_DEFAULT_IN.inMin,
      inMax: DRIVER_REMAP_DEFAULT_IN.inMax,
    };
    onAudioSetupChange?.(addAudioRemapper(audioSetup, newRemapper));
  }

  function handleFocusedTargetOutChange(patch: { outMin?: number; outMax?: number }) {
    if (!focusedConnection?.id || !onGraphUpdate) return;
    onGraphUpdate(
      updateConnectionDriverOut(
        graph,
        focusedConnection.id,
        connectionDriverOutPatchFromUi(patch)
      )
    );
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

  function targetOutLiveForRemapper(remapperId: string): number | null {
    if (!hasConnectTarget || focusRemapperId !== remapperId) return null;
    const gated = liveValuesByRemapper.get(remapperId)?.gated;
    if (gated == null) return null;
    return applyDriverTargetRange(
      gated,
      focusedConnectionOut.outMin,
      focusedConnectionOut.outMax
    );
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
    activeNavBandId = remaining.length > 0 ? ALL_BANDS : null;
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
      onclick={handleNewBandClick}
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
        All drivers
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
            onclick={handleNewBandClick}
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
                  activeNavBandId = remaining.length > 0 ? ALL_BANDS : null;
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
            <p class="remappers-empty">
              {hasConnectTarget
                ? 'No remaps yet. Add one, then connect it to this parameter.'
                : 'No remaps yet. Add one, then connect it from a parameter port.'}
            </p>
          {:else}
            <div class="remappers-list" role="list" aria-label="Remaps for {band.name}">
              {#each bandRemappers as remapper (remapper.id)}
                {@const connected = isRemapperConnectedToTarget(remapper.id)}
                <div use:setRemapperRef={remapper.id}>
                  <RemapperCard
                    remapper={remapper}
                    bandName={band.name}
                    liveValues={(() => {
                      const live = liveValuesByRemapper.get(remapper.id);
                      return live
                        ? {
                            incoming: live.incoming,
                            outgoing: connected ? targetOutLiveForRemapper(remapper.id) : null,
                          }
                        : null;
                    })()}
                    controlsLayout="driver-focused"
                    remapSections={connected && hasConnectTarget ? 'both' : 'gateOnly'}
                    targetOutMin={focusedConnectionOut.outMin}
                    targetOutMax={focusedConnectionOut.outMax}
                    paramMin={connected ? driverRemapParamMin : undefined}
                    paramMax={connected ? driverRemapParamMax : undefined}
                    paramStep={connected ? driverRemapParamStep : undefined}
                    paramType={connected ? driverRemapParamType : undefined}
                    onTargetOutChange={connected ? handleFocusedTargetOutChange : undefined}
                    onConnect={
                      hasConnectTarget && !connected
                        ? () => handleConnectRemapper(remapper.id)
                        : undefined
                    }
                    onDisconnect={hasConnectTarget && connected ? handleDisconnect : undefined}
                    onDelete={() => {
                      tryDeleteRemapper(remapper.id);
                    }}
                    onDuplicate={() => handleDuplicateRemapper(remapper)}
                    onRemapperChange={(updater) => handleRemapperChange(remapper.id, updater)}
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
