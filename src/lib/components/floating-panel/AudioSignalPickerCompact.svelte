<script lang="ts">
  /**
   * AudioSignalPickerCompact - focused parameter driver body (remapper or raw band).
   * Layout parallels MidiEnvelopeCard embedded mode.
   */
  import FrequencyRangeEditor from '../audio/FrequencyRangeEditor.svelte';
  import RemapperCard from '../audio/RemapperCard.svelte';
  import type { CompactSlotProps } from './AudioSignalPicker.types';
  import type { AudioBandEntry, AudioRemapperEntry } from '../../../data-model/audioSetupTypes';
  import {
    updateAudioBand,
    updateAudioRemapper,
    updateConnectionDriverOut,
  } from '../../../data-model';
  import { subscribeParameterValueTick } from '../../stores/parameterValueTickStore';
  import DriverFocusedHeader from './DriverFocusedHeader.svelte';
  import {
    formatDriverBandSourceText,
    resolveDriverTargetDisplay,
  } from './driverTargetDisplay';
  import {
    applyDriverTargetRange,
    connectionDriverOutPatchFromUi,
    resolveConnectionDriverOut,
  } from '../../../utils/driverRemap';

  let {
    parameterTitle,
    graph,
    nodeSpecs,
    audioSetup,
    onSelect: _onSelect,
    onAudioSetupChange,
    onGraphUpdate,
    connectedSignalId,
    getAudioManager,
    onRevealInNodeEditor,
    onOpenLargeWithBand,
    targetNodeId,
    targetParameter,
    triggerElement: _triggerElement,
    connectedVirtualNodeId: _connectedVirtualNodeId,
    connectionId,
    onClose: _onClose,
  }: CompactSlotProps = $props();

  let spectrumDataByBand = $state<Map<string, { frequencyData: Uint8Array; fftSize: number; sampleRate: number }>>(new Map());
  let liveValuesByRemapper = $state<Map<string, { incoming: number | null; gated: number | null }>>(new Map());

  const LIVE_UPDATE_INTERVAL_MS = 50;

  $effect(() => {
    const am = getAudioManager?.();
    const setup = audioSetup;
    if (!am || typeof am.getAnalyzerSpectrumData !== 'function') return;
    let lastUpdateTime = 0;
    const specMap = new Map<string, { frequencyData: Uint8Array; fftSize: number; sampleRate: number }>();
    const liveMap = new Map<string, { incoming: number | null; gated: number | null }>();
    return subscribeParameterValueTick(() => {
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
  });

  type Resolved =
    | { kind: 'band'; band: AudioBandEntry }
    | { kind: 'remapper'; remapper: AudioRemapperEntry; band: AudioBandEntry }
    | { kind: 'not-found' };

  const resolved = $derived.by((): Resolved => {
    if (connectedSignalId.endsWith('-raw') && connectedSignalId.startsWith('band-')) {
      const bandId = connectedSignalId.slice(5, -4);
      const band = audioSetup.bands.find((b) => b.id === bandId);
      if (band) return { kind: 'band', band };
    }
    if (connectedSignalId.startsWith('remap-')) {
      const remapperId = connectedSignalId.slice(6);
      const remapper = audioSetup.remappers.find((r) => r.id === remapperId);
      if (remapper) {
        const band = audioSetup.bands.find((b) => b.id === remapper.bandId);
        if (band) return { kind: 'remapper', remapper, band };
      }
    }
    return { kind: 'not-found' };
  });

  function handleBandChange(bandId: string, updater: (b: AudioBandEntry) => AudioBandEntry) {
    onAudioSetupChange(updateAudioBand(audioSetup, bandId, updater));
  }

  function handleRemapperChange(remapperId: string, updater: (r: AudioRemapperEntry) => AudioRemapperEntry) {
    onAudioSetupChange(updateAudioRemapper(audioSetup, remapperId, updater));
  }

  const targetDisplay = $derived(
    resolveDriverTargetDisplay(graph, nodeSpecs, targetNodeId, targetParameter)
  );

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

  const focusedConnection = $derived(
    graph.connections.find((c) => c.id === connectionId) ?? null
  );

  const focusedConnectionOut = $derived(
    focusedConnection ? resolveConnectionDriverOut(focusedConnection) : { outMin: 0, outMax: 1 }
  );

  const focusedTargetOutLive = $derived.by(() => {
    if (resolved.kind !== 'remapper') return null;
    const gated = liveValuesByRemapper.get(resolved.remapper.id)?.gated;
    if (gated == null) return null;
    return applyDriverTargetRange(
      gated,
      focusedConnectionOut.outMin,
      focusedConnectionOut.outMax
    );
  });

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
</script>

<div class="audio-driver-compact">
  {#if resolved.kind === 'not-found'}
    <p class="fallback">Signal not found</p>
  {:else if resolved.kind === 'band'}
    {@const band = resolved.band}
    {@const bandId = band.id}
    <div class="audio-driver-card is-embedded">
      {#if targetDisplay}
        <DriverFocusedHeader
          target={targetDisplay}
          embedded
          onReveal={onRevealInNodeEditor}
        >
          {#snippet trailing()}
            <span class="focused-source" title={formatDriverBandSourceText(band)}>
              {formatDriverBandSourceText(band)}
            </span>
          {/snippet}
        </DriverFocusedHeader>
      {/if}
      <div class="editor-wrap">
        <FrequencyRangeEditor
          frequencyBands={band.frequencyBands}
          spectrumData={spectrumDataByBand.get(bandId)?.frequencyData}
          sampleRate={spectrumDataByBand.get(bandId)?.sampleRate ?? 44100}
          fftSize={band.fftSize}
          fftSizeValue={band.fftSize}
          bandMode={band.bandMode ?? 'mean'}
          attackHalfLifeSeconds={band.attackHalfLifeSeconds}
          onBandModeChange={(mode) => handleBandChange(bandId, (b) => ({ ...b, bandMode: mode }))}
          releaseHalfLifeSeconds={band.releaseHalfLifeSeconds}
          onChange={(bands) => handleBandChange(bandId, (b) => ({ ...b, frequencyBands: bands }))}
          onAttackHalfLifeSecondsChange={(v) =>
            handleBandChange(bandId, (b) => ({ ...b, attackHalfLifeSeconds: v != null ? Math.max(0, v) : undefined }))}
          onReleaseHalfLifeSecondsChange={(v) =>
            handleBandChange(bandId, (b) => ({ ...b, releaseHalfLifeSeconds: v != null ? Math.max(0, v) : undefined }))}
          onFftSizeChange={(v) =>
            handleBandChange(bandId, (b) => ({ ...b, fftSize: Math.max(256, Math.min(8192, Math.round(v / 256) * 256)) }))}
        />
      </div>
    </div>
  {:else if resolved.kind === 'remapper'}
    {@const remapper = resolved.remapper}
    {@const band = resolved.band}
    {@const remapperId = remapper.id}
    {@const live = liveValuesByRemapper.get(remapperId)}
    <div class="audio-driver-card is-embedded">
      {#if targetDisplay}
        <DriverFocusedHeader
          target={targetDisplay}
          liveValue={focusedTargetOutLive}
          embedded
          onReveal={onRevealInNodeEditor}
        >
          {#snippet trailing()}
            <span class="focused-source" title={formatDriverBandSourceText(band)}>
              {formatDriverBandSourceText(band)}
            </span>
          {/snippet}
        </DriverFocusedHeader>
      {/if}
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
      <div class="remapper-wrap">
        <RemapperCard
          remapper={remapper}
          bandName={band.name}
          liveValues={
            live
              ? {
                  incoming: live.incoming,
                  outgoing: focusedConnection ? focusedTargetOutLive : null,
                }
              : null
          }
          controlsLayout="driver-focused"
          remapSections={focusedConnection ? 'both' : 'gateOnly'}
          targetOutMin={focusedConnectionOut.outMin}
          targetOutMax={focusedConnectionOut.outMax}
          paramMin={driverRemapParamMin}
          paramMax={driverRemapParamMax}
          paramStep={driverRemapParamStep}
          paramType={driverRemapParamType}
          onTargetOutChange={handleFocusedTargetOutChange}
          onRemapperChange={(updater) => handleRemapperChange(remapperId, updater)}
        />
      </div>
    </div>
  {/if}
</div>

<style>
  .audio-driver-compact {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    min-height: 0;
    flex: 1;
    overflow: hidden;
  }

  .fallback {
    margin: var(--pd-md);
    font-size: var(--text-sm);
    color: var(--color-gray-100);
  }

  .audio-driver-card {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    cursor: default;

    &.is-embedded {
      padding-bottom: 0;
      background: transparent;
      border: none;
      border-radius: 0;

      .editor-wrap,
      .frequency-wrap {
        padding: var(--pd-sm) var(--pd-md) 0;
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
      }

      .remapper-wrap {
        width: 100%;
        min-width: 0;
        max-width: 100%;
        box-sizing: border-box;
        padding: var(--pd-sm) var(--pd-md);
        border-top: 1px solid var(--color-gray-70);

        :global(.remapper-card.panel-card) {
          width: 100%;
          min-width: 0;
          max-width: 100%;
          box-sizing: border-box;
          margin: 0;
        }
      }

      :global(.focused-source) {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: var(--text-xs);
        color: var(--color-gray-100);
      }

      .signal-section {
        padding: var(--pd-md) var(--pd-md) var(--pd-sm);
      }
    }

    .signal-section {
      border-top: 1px solid var(--color-gray-70);
      margin-top: var(--pd-md);
    }

    .signal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--pd-sm);
      margin-bottom: var(--pd-xs);

      .signal-label {
        font-size: var(--text-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-gray-110);
      }
    }

    .signal-meta {
      display: flex;
      flex-direction: column;
      gap: var(--pd-2xs);
      min-width: 0;
      font-size: var(--text-sm);
      color: var(--color-gray-120);
    }

    .signal-detail {
      font-size: var(--text-xs);
      color: var(--color-gray-100);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .compact-row {
      display: flex;
      align-items: center;
      gap: var(--pd-sm);
      margin-top: var(--pd-sm);

      .row-label {
        flex-shrink: 0;
        font-size: var(--text-xs);
        color: var(--color-gray-110);
      }

      .source {
        position: relative;
        flex: 1;
        min-width: 0;
      }
    }

  }
</style>
