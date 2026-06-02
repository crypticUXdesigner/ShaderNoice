<script lang="ts">
  /**
   * MIDI driver panel — track-set library + remaps (audio band/remap parity).
   */
  import { Button, IconSvg, EditableLabel } from '../ui';
  import DriverPanelEmptyState from './DriverPanelEmptyState.svelte';
  import MidiEnvelopeCard from './MidiEnvelopeCard.svelte';
  import MidiRemapperCard from './MidiRemapperCard.svelte';
  import type { MidiDriverPanelProps } from './AudioSignalPicker.types';
  import type { MidiEnvelopePreset, MidiEnvelopeRemapper } from '../../../data-model/midiEnvelopeTypes';
  import {
    addMidiEnvelopeBinding,
    addMidiEnvelopeRemapper,
    connectMidiEnvelopeRemapperToParam,
    duplicateMidiEnvelopeRemapper,
    envelopePresetIdForBinding,
    findMidiEnvelopeBindingForParam,
    findMidiEnvelopePreset,
    removeMidiEnvelopePreset,
    removeMidiEnvelopeRemapper,
    unbindMidiEnvelopeBindingForParam,
    updateMidiEnvelopePreset,
    updateMidiEnvelopeRemapper,
  } from '../../../data-model';
  import { listArrangementTracksForFilter } from '../../../audiotool/arrangement/arrangementTrackFilter';
  import { prepareGraphForMidiDriverAttach } from '../../../utils/parameterDriverAttach';
  import { confirmDeleteDriverAsset } from '../../../utils/confirmDriverAssetDelete';
  import { getMidiEnvelopeRemapperConnections } from '../../../utils/getMidiEnvelopeRemapperConnections';
  import { getMidiEnvelopePresetConnections } from '../../../utils/getMidiEnvelopePresetConnections';
  import {
    getMidiEnvelopeFramePresetShape,
    getMidiEnvelopeFrameValueByBindingId,
    syncMidiEnvelopeFrame,
  } from '../../../utils/midiEnvelopeFrameCache';
  import { subscribeParameterValueTick } from '../../stores/parameterValueTickStore';
  import DriverFocusedHeader from './DriverFocusedHeader.svelte';
  import {
    formatDriverMidiTrackSetSourceText,
    resolveDriverConnectionTargetDisplay,
    resolveDriverTargetDisplay,
  } from './driverTargetDisplay';
  import { getParameterDriverKindMeta } from '../../../utils/parameterDriverKindMeta';
  import type { Action } from 'svelte/action';

  const midiKindIcon = getParameterDriverKindMeta('midi');
  const ALL_ENVELOPES = Symbol('allEnvelopes');

  const NOTE_TRACK_KINDS = new Set(['note'] as const);

  let {
    targetNodeId,
    targetParameter,
    graph,
    nodeSpecs,
    audioSetup,
    onGraphUpdate,
    getTimelineState,
    registerDeleteHandler,
    layoutMode = 'overview',
    initialPresetId,
    focusRemapperId,
    onSelectedPresetChange,
    onDriverAttached,
    onClose,
    onRevealInNodeEditor,
    onBrowseOverview,
    arrangementImportBusy = false,
    onImportArrangement,
  }: MidiDriverPanelProps = $props();

  let activeNavPresetId = $state<string | typeof ALL_ENVELOPES | null>(null);
  let sectionRefs = $state<Map<string, HTMLElement>>(new Map());
  let remapperRefs = $state<Map<string, HTMLElement>>(new Map());
  let liveOutputByBinding = $state<Map<string, number>>(new Map());
  let livePresetShapeByPreset = $state<Map<string, number>>(new Map());
  let didInitialScroll = $state(false);

  const snapshot = $derived(audioSetup.arrangementSnapshot);
  const needsProjectFetch = $derived(snapshot == null);
  const canImportArrangement = $derived(onImportArrangement != null);

  const tracks = $derived(
    listArrangementTracksForFilter(snapshot, {
      kinds: NOTE_TRACK_KINDS,
      hideEmpty: true,
      hideEmptyMetric: 'notes',
    })
  );

  const tracksById = $derived(new Map(tracks.map((t) => [t.id, t] as const)));

  const allPresets = $derived(graph.midiEnvelopePresets ?? []);
  const allRemappers = $derived(graph.midiEnvelopeRemappers ?? []);

  const navPresets = $derived(allPresets);

  const remappersByPreset = $derived.by(() => {
    const map = new Map<string, MidiEnvelopeRemapper[]>();
    for (const preset of allPresets) {
      map.set(
        preset.id,
        allRemappers.filter((r) => r.envelopePresetId === preset.id)
      );
    }
    return map;
  });

  const currentParamBinding = $derived(
    findMidiEnvelopeBindingForParam(graph, targetNodeId, targetParameter) ?? null
  );

  const currentPreset = $derived.by(() => {
    if (!currentParamBinding) return null;
    const presetId = envelopePresetIdForBinding(graph, currentParamBinding);
    return presetId ? (findMidiEnvelopePreset(graph, presetId) ?? null) : null;
  });

  const currentRemapper = $derived.by(() => {
    if (!currentParamBinding) return null;
    return allRemappers.find((r) => r.id === currentParamBinding.remapperId) ?? null;
  });

  const targetDisplay = $derived(
    resolveDriverTargetDisplay(graph, nodeSpecs, targetNodeId, targetParameter)
  );

  const focusedLiveValue = $derived.by(() => {
    if (!currentParamBinding) return null;
    const v = liveOutputByBinding.get(currentParamBinding.id);
    return v !== undefined ? v : null;
  });

  const visiblePresets = $derived.by(() => {
    if (activeNavPresetId === ALL_ENVELOPES) return navPresets;
    if (typeof activeNavPresetId === 'string') {
      return allPresets.filter((p) => p.id === activeNavPresetId);
    }
    return allPresets.length > 0 ? [allPresets[0]!] : [];
  });

  const deleteTargetPreset = $derived(
    typeof activeNavPresetId === 'string'
      ? (allPresets.find((p) => p.id === activeNavPresetId) ?? null)
      : null
  );

  $effect(() => {
    if (layoutMode !== 'overview' || activeNavPresetId) return;
    const current = currentPreset;
    if (current) {
      activeNavPresetId = current.id;
      return;
    }
    if (allPresets.length > 0) {
      activeNavPresetId = allPresets[0]!.id;
    }
  });

  $effect(() => {
    if (layoutMode !== 'overview') return;
    const presets = allPresets;
    if (presets.length === 0) return;
    if (activeNavPresetId === ALL_ENVELOPES) return;
    if (typeof activeNavPresetId === 'string' && presets.some((p) => p.id === activeNavPresetId)) {
      return;
    }
    activeNavPresetId = presets[0]!.id;
  });

  $effect(() => {
    onSelectedPresetChange?.(
      typeof activeNavPresetId === 'string' ? activeNavPresetId : null
    );
  });

  $effect(() => {
    if (didInitialScroll) return;
    const remapperId = focusRemapperId;
    const presetId = initialPresetId;
    if (remapperId) {
      const remapper = allRemappers.find((r) => r.id === remapperId);
      if (remapper) {
        activeNavPresetId = remapper.envelopePresetId;
        queueMicrotask(() => scrollToRemapper(remapperId));
        didInitialScroll = true;
        return;
      }
    }
    if (presetId && allPresets.some((p) => p.id === presetId)) {
      activeNavPresetId = presetId;
      queueMicrotask(() => scrollToPreset(presetId));
      didInitialScroll = true;
    }
  });

  function isRemapperConnectedToTarget(remapperId: string): boolean {
    return currentParamBinding?.remapperId === remapperId;
  }

  function canConnectRemapper(remapperId: string): boolean {
    return !isRemapperConnectedToTarget(remapperId);
  }

  $effect(() => {
    registerDeleteHandler?.(
      deleteTargetPreset ? () => handleRemovePreset(deleteTargetPreset.id) : null
    );
    return () => registerDeleteHandler?.(null);
  });

  $effect(() => {
    const bindings = graph.midiEnvelopeBindings ?? [];
    const snap = snapshot;
    const presets = allPresets;
    if (!bindings.length || !snap) {
      liveOutputByBinding = new Map();
      livePresetShapeByPreset = new Map();
      return;
    }
    return subscribeParameterValueTick(() => {
      const t = getTimelineState?.()?.currentTime ?? 0;
      syncMidiEnvelopeFrame(graph, snap, t);
      const nextOut = new Map<string, number>();
      for (const b of bindings) {
        const value = getMidiEnvelopeFrameValueByBindingId(b.id);
        if (value !== undefined) {
          nextOut.set(b.id, value);
        }
      }
      liveOutputByBinding = nextOut;
      const nextShape = new Map<string, number>();
      for (const preset of presets) {
        const shape = getMidiEnvelopeFramePresetShape(preset.id);
        if (shape !== undefined) {
          nextShape.set(preset.id, shape);
        }
      }
      livePresetShapeByPreset = nextShape;
    });
  });

  function presetDisplayName(preset: MidiEnvelopePreset): string {
    if (preset.label?.trim()) return preset.label.trim();
    const trackCount = preset.trackIds.length;
    return trackCount > 0 ? `Track set (${trackCount} tracks)` : 'Track set';
  }

  function presetLabelPlaceholder(preset: MidiEnvelopePreset): string {
    const trackCount = preset.trackIds.length;
    return trackCount > 0 ? `Track set (${trackCount} tracks)` : 'Track set';
  }

  function scrollToPreset(presetId: string) {
    sectionRefs.get(presetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function scrollToRemapper(remapperId: string) {
    remapperRefs.get(remapperId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function selectNavPreset(presetId: string | typeof ALL_ENVELOPES) {
    activeNavPresetId = presetId;
    if (presetId !== ALL_ENVELOPES) {
      scrollToPreset(presetId);
    }
  }

  function handleAddEnvelope() {
    if (currentParamBinding) {
      const presetId = envelopePresetIdForBinding(graph, currentParamBinding);
      if (presetId) activeNavPresetId = presetId;
      return;
    }
    const prepared = prepareGraphForMidiDriverAttach(graph, targetNodeId, targetParameter);
    const defaultTrackIds = tracks.length > 0 ? [tracks[0]!.id] : [];
    const next = addMidiEnvelopeBinding(prepared, targetNodeId, targetParameter, {
      trackIds: defaultTrackIds,
    });
    onGraphUpdate(next);
    const created = findMidiEnvelopeBindingForParam(next, targetNodeId, targetParameter);
    if (created) {
      const presetId = envelopePresetIdForBinding(next, created);
      if (presetId) activeNavPresetId = presetId;
    }
    onDriverAttached?.();
  }

  function handleConnectRemapper(remapperId: string) {
    if (!canConnectRemapper(remapperId)) return;
    const prepared = prepareGraphForMidiDriverAttach(graph, targetNodeId, targetParameter);
    const next = connectMidiEnvelopeRemapperToParam(
      prepared,
      remapperId,
      targetNodeId,
      targetParameter
    );
    onGraphUpdate(next);
    const remapper = allRemappers.find((r) => r.id === remapperId);
    if (remapper) activeNavPresetId = remapper.envelopePresetId;
    onDriverAttached?.();
  }

  function handleDisconnectFromParam() {
    if (!currentParamBinding) return;
    onGraphUpdate(unbindMidiEnvelopeBindingForParam(graph, targetNodeId, targetParameter));
    onClose?.();
  }

  function handleRemovePreset(presetId: string) {
    const connectionCount = getMidiEnvelopePresetConnections(graph, presetId, nodeSpecs).length;
    if (!confirmDeleteDriverAsset({ assetKind: 'envelope', connectionCount })) return;
    onGraphUpdate(removeMidiEnvelopePreset(graph, presetId));
    if (activeNavPresetId === presetId) {
      const remaining = allPresets.filter((p) => p.id !== presetId);
      activeNavPresetId =
        currentPreset?.id && remaining.some((p) => p.id === currentPreset.id)
          ? currentPreset.id
          : (remaining[0]?.id ?? null);
    }
  }

  function tryDeleteRemapper(remapperId: string): boolean {
    const connectionCount = getMidiEnvelopeRemapperConnections(graph, remapperId, nodeSpecs).length;
    if (!confirmDeleteDriverAsset({ assetKind: 'remapper', connectionCount })) {
      return false;
    }
    onGraphUpdate(removeMidiEnvelopeRemapper(graph, remapperId));
    return true;
  }

  function handleAddRemapper(presetId: string) {
    const presetRemappers = remappersByPreset.get(presetId) ?? [];
    onGraphUpdate(
      addMidiEnvelopeRemapper(graph, presetId, {
        name: `Remap ${presetRemappers.length + 1}`,
      })
    );
  }

  const setSectionRef: Action<HTMLElement, string> = (node, presetId) => {
    sectionRefs.set(presetId, node);
    return {
      update(nextPresetId) {
        if (nextPresetId !== presetId) {
          sectionRefs.delete(presetId);
          presetId = nextPresetId;
        }
        sectionRefs.set(presetId, node);
      },
      destroy() {
        sectionRefs.delete(presetId);
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

  function patchPreset(
    presetId: string,
    patch: Partial<Pick<MidiEnvelopePreset, 'label' | 'trackIds' | 'envelope'>>
  ) {
    onGraphUpdate(updateMidiEnvelopePreset(graph, presetId, patch));
  }

  function patchRemapper(
    remapperId: string,
    patch: Partial<Pick<MidiEnvelopeRemapper, 'name' | 'outMin' | 'outMax'>>
  ) {
    onGraphUpdate(updateMidiEnvelopeRemapper(graph, remapperId, patch));
  }

  function connectedTracksFor(preset: MidiEnvelopePreset) {
    return preset.trackIds
      .map((id) => tracksById.get(id))
      .filter((t): t is NonNullable<typeof t> => t != null);
  }

  function availableTracksFor(preset: MidiEnvelopePreset) {
    const connected = new Set(preset.trackIds);
    return tracks.filter((t) => !connected.has(t.id));
  }

  function handleAddTrack(presetId: string, trackId: string) {
    const preset = findMidiEnvelopePreset(graph, presetId);
    if (!preset || preset.trackIds.includes(trackId)) return;
    patchPreset(presetId, { trackIds: [...preset.trackIds, trackId] });
  }

  function handleRemoveTrack(presetId: string, trackId: string) {
    const preset = findMidiEnvelopePreset(graph, presetId);
    if (!preset) return;
    patchPreset(presetId, {
      trackIds: preset.trackIds.filter((id) => id !== trackId),
    });
  }
</script>

{#snippet fetchProjectEmptyState()}
  <DriverPanelEmptyState
    icon={midiKindIcon.icon}
    iconVariant={midiKindIcon.iconVariant ?? 'line'}
    driverKind="midi"
    title="No MIDI data"
    copy="Fetch your studio project to import arrangement note tracks first. Then use the MIDI data to drive parameters."
    spacious
  >
    {#snippet primaryAction()}
      {#if canImportArrangement}
        <Button
          variant="primary"
          size="md"
          mode="both"
          disabled={arrangementImportBusy}
          title="Fetch arrangement from studio project"
          aria-busy={arrangementImportBusy}
          aria-label="Fetch project"
          onclick={() => onImportArrangement?.()}
        >
          {arrangementImportBusy ? 'Fetching…' : 'Fetch project'}
        </Button>
      {/if}
    {/snippet}
  </DriverPanelEmptyState>
{/snippet}

<div
  class="midi-driver-panel"
  class:is-focused-layout={layoutMode === 'focused'}
  role="group"
  aria-label="MIDI driver configuration"
>
  {#if layoutMode === 'overview'}
    <nav class="envelope-nav scrollbar-styled" aria-label="Track sets">
      <Button
        variant="primary"
        size="sm"
        mode="both"
        class="nav-add"
        disabled={needsProjectFetch || tracks.length === 0 || currentParamBinding != null}
        title={
          currentParamBinding
            ? 'This parameter already has a MIDI driver'
            : needsProjectFetch
              ? 'Fetch project first'
              : tracks.length === 0
                ? 'Import an arrangement with note data first'
                : 'New'
        }
        aria-label={
          currentParamBinding
            ? 'This parameter already has a MIDI driver'
            : needsProjectFetch
              ? 'Fetch project first'
              : tracks.length === 0
                ? 'Import note tracks first'
                : 'New'
        }
        onclick={handleAddEnvelope}
      >
        <IconSvg name="plus" variant="line" />
        New
      </Button>

      {#if allPresets.length > 0}
        <button
          type="button"
          class="nav-item"
          class:is-active={activeNavPresetId === ALL_ENVELOPES}
          onclick={() => selectNavPreset(ALL_ENVELOPES)}
        >
          All track sets
        </button>
        {#each navPresets as preset (preset.id)}
          <button
            type="button"
            class="nav-item"
            class:is-active={activeNavPresetId === preset.id}
            onclick={() => selectNavPreset(preset.id)}
            title={presetDisplayName(preset)}
          >
            {presetDisplayName(preset)}
          </button>
        {/each}
      {/if}
    </nav>
  {/if}

  <div
    class="sections"
    class:scrollbar-styled={layoutMode === 'overview'}
    class:scrollbar-no-gutter={layoutMode === 'focused'}
    role="region"
    aria-label="Track set sections"
  >
    {#if layoutMode === 'focused'}
      {#if currentPreset && currentParamBinding && currentRemapper}
        {@const presetName = presetDisplayName(currentPreset)}
        {@const focusedTracks = connectedTracksFor(currentPreset)}
        {@const midiSourceText = formatDriverMidiTrackSetSourceText(presetName, focusedTracks)}
        <div class="midi-driver-compact">
          <div class="midi-driver-card is-embedded">
            {#if targetDisplay}
              <DriverFocusedHeader
                target={targetDisplay}
                liveValue={focusedLiveValue}
                embedded
                onReveal={onRevealInNodeEditor}
              >
                {#snippet trailing()}
                  <span class="focused-source" title={midiSourceText}>
                    {midiSourceText}
                  </span>
                {/snippet}
              </DriverFocusedHeader>
            {/if}
            <MidiEnvelopeCard
              preset={currentPreset}
              title={presetName}
              embedded
              hideTitleHeader
              hideTracksSection
              livePresetShape={livePresetShapeByPreset.get(currentPreset.id) ?? null}
              connectedTracks={connectedTracksFor(currentPreset)}
              availableTracks={availableTracksFor(currentPreset)}
              onPresetChange={(patch) => patchPreset(currentPreset.id, patch)}
              onAddTrack={(trackId) => handleAddTrack(currentPreset.id, trackId)}
              onRemoveTrack={(trackId) => handleRemoveTrack(currentPreset.id, trackId)}
            />
            <div class="remapper-wrap">
              <MidiRemapperCard
                embedded
                remapper={currentRemapper}
                envelopePresetName={presetName}
                isConnectedToTarget={true}
                onRemapperChange={(patch) => patchRemapper(currentRemapper.id, patch)}
                connectionTargets={getMidiEnvelopeRemapperConnections(
                  graph,
                  currentRemapper.id,
                  nodeSpecs
                )
                  .map((c) =>
                    resolveDriverConnectionTargetDisplay(graph, nodeSpecs, c.nodeId, c.paramName)
                  )
                  .filter((t): t is NonNullable<typeof t> => t != null)}
                activeTargetNodeId={targetNodeId}
                activeTargetParamName={targetParameter}
                onRevealParameter={onRevealInNodeEditor}
              />
            </div>
          </div>
        </div>
      {:else if needsProjectFetch}
        {@render fetchProjectEmptyState()}
      {:else}
        <DriverPanelEmptyState
          icon={midiKindIcon.icon}
          iconVariant={midiKindIcon.iconVariant ?? 'line'}
          driverKind="midi"
          title="No MIDI driver on this parameter"
          copy="Open the track-set library, pick a remap, then use Connect on that card to drive this parameter."
          spacious
        >
          {#snippet primaryAction()}
            <Button
              variant="primary"
              size="md"
              mode="both"
              title="Browse track sets"
              aria-label="Browse track sets"
              onclick={() => onBrowseOverview?.()}
            >
              <IconSvg name="swap" variant="line" />
              Browse
            </Button>
          {/snippet}
        </DriverPanelEmptyState>
      {/if}
    {:else if needsProjectFetch}
      {@render fetchProjectEmptyState()}
    {:else if allPresets.length === 0}
      <DriverPanelEmptyState
        icon={midiKindIcon.icon}
        iconVariant={midiKindIcon.iconVariant ?? 'line'}
        driverKind="midi"
        title="No MIDI drivers yet"
        copy="Create a driver, select MIDI tracks and configure the envelope."
        secondaryHint={tracks.length === 0 ? 'Import an arrangement snapshot with note tracks first.' : undefined}
        spacious
      >
        {#snippet primaryAction()}
          <Button
            variant="primary"
            size="md"
            mode="both"
            disabled={tracks.length === 0}
            title={tracks.length === 0 ? 'Import note tracks first' : 'New'}
            aria-label={tracks.length === 0 ? 'Import note tracks first' : 'New'}
            onclick={handleAddEnvelope}
          >
            <IconSvg name="plus" variant="line" />
            New
          </Button>
        {/snippet}
      </DriverPanelEmptyState>
    {:else}
      {#each visiblePresets as preset (preset.id)}
        {@const presetRemappers = remappersByPreset.get(preset.id) ?? []}
        {@const presetName = presetDisplayName(preset)}
        <section
          class="envelope-section frame-elevated"
          aria-labelledby="envelope-heading-{preset.id}"
          use:setSectionRef={preset.id}
        >
          <header class="section-header" id="envelope-heading-{preset.id}">
            <EditableLabel
              value={preset.label ?? ''}
              placeholder={presetLabelPlaceholder(preset)}
              ariaLabel="Track set name"
              onCommit={(value) => patchPreset(preset.id, { label: value })}
            />
            {#if livePresetShapeByPreset.get(preset.id) != null}
              <span
                class="section-live-output"
                title="Live hit level"
              >
                {(livePresetShapeByPreset.get(preset.id) ?? 0).toFixed(3)}
              </span>
            {/if}
            <Button
              variant="ghost"
              size="sm"
              mode="icon-only"
              title="Delete track set"
              aria-label={`Delete track set: ${presetName}`}
              onclick={() => handleRemovePreset(preset.id)}
            >
              <IconSvg name="trash" variant="line" />
            </Button>
          </header>

          <MidiEnvelopeCard
            preset={preset}
            title={presetName}
            embedded
            hideTitleHeader
            isSelected={activeNavPresetId === preset.id}
            livePresetShape={livePresetShapeByPreset.get(preset.id) ?? null}
            connectedTracks={connectedTracksFor(preset)}
            availableTracks={availableTracksFor(preset)}
            onPresetChange={(patch) => patchPreset(preset.id, patch)}
            onAddTrack={(trackId) => handleAddTrack(preset.id, trackId)}
            onRemoveTrack={(trackId) => handleRemoveTrack(preset.id, trackId)}
          />

          <div class="remappers-header">
            <span class="remappers-label">Remaps</span>
            <Button variant="ghost" size="sm" mode="both" onclick={() => handleAddRemapper(preset.id)}>
              <IconSvg name="plus" variant="line" />
              Add remap
            </Button>
          </div>

          {#if presetRemappers.length === 0}
            <p class="remappers-empty">No remaps yet. Add one, then connect it to this parameter.</p>
          {:else}
            <div class="remappers-list" role="list" aria-label="Remaps for {presetName}">
              {#each presetRemappers as remapper (remapper.id)}
                {@const connected = isRemapperConnectedToTarget(remapper.id)}
                {@const connectionTargets = getMidiEnvelopeRemapperConnections(
                  graph,
                  remapper.id,
                  nodeSpecs
                )
                  .map((c) =>
                    resolveDriverConnectionTargetDisplay(graph, nodeSpecs, c.nodeId, c.paramName)
                  )
                  .filter((t): t is NonNullable<typeof t> => t != null)}
                <div use:setRemapperRef={remapper.id}>
                  <MidiRemapperCard
                    remapper={remapper}
                    envelopePresetName={presetName}
                    isConnectedToTarget={connected}
                    onConnect={
                      canConnectRemapper(remapper.id)
                        ? () => handleConnectRemapper(remapper.id)
                        : undefined
                    }
                    onDisconnect={connected ? handleDisconnectFromParam : undefined}
                    onDelete={() => {
                      tryDeleteRemapper(remapper.id);
                    }}
                    onDuplicate={() =>
                      onGraphUpdate(duplicateMidiEnvelopeRemapper(graph, remapper.id))}
                    onRemapperChange={(patch) => patchRemapper(remapper.id, patch)}
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
  .midi-driver-panel {
    display: grid;
    grid-template-columns: minmax(120px, 148px) minmax(0, 1fr);
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;

    &.is-focused-layout {
      display: flex;
      flex-direction: column;
      grid-template-columns: unset;
      flex: 1;
      min-height: 0;

      .sections {
        flex: 1;
        min-height: 0;
        padding: 0;
        gap: 0;
        background: transparent;
        overflow: hidden;
      }

    }
  }

  .midi-driver-compact {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    min-height: 0;
    flex: 1;
    overflow: hidden;
  }

  .midi-driver-card.is-embedded {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
    padding-bottom: 0;
    background: transparent;
    border: none;
    border-radius: 0;

    :global(.focused-source) {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: var(--text-xs);
      color: var(--color-gray-100);
    }

    .remapper-wrap {
      width: 100%;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      padding: var(--pd-sm) var(--pd-md);
      border-top: 1px solid var(--color-gray-70);

      :global(.midi-remapper-card.panel-card) {
        width: 100%;
        min-width: 0;
        max-width: 100%;
        box-sizing: border-box;
        margin: 0;
      }
    }
  }

  .envelope-nav {
    display: flex;
    flex-direction: column;
    gap: var(--pd-2xs);
    flex: 1;
    min-height: 0;
    padding: var(--pd-sm);
    border-right: 1px solid var(--color-gray-50);
    background: var(--color-gray-20);
    overflow-y: auto;

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

  .envelope-section {
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

    :global(.editable-label) {
      flex: 1;
      min-width: 0;
    }

    .section-live-output {
      flex-shrink: 0;
      font-size: var(--text-xs);
      font-variant-numeric: tabular-nums;
      color: var(--color-violet-110);
    }
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
