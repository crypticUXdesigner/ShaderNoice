<script lang="ts">
  /**
   * Unified parameter driver panel — port-centric shell for audio, animation, and MIDI drivers.
   * Overview mode: large surface to browse, connect, and edit many drivers.
   * Focused mode: compact surface to tune the attached driver with minimal chrome.
   */
  import type { NodeGraph } from '../../../data-model/types';
  import type { NodeSpec } from '../../../types/nodeSpec';
  import type { AudioSetup } from '../../../data-model/audioSetupTypes';
  import type { SignalSelectPayload } from '../../../types/editor';
  import type {
    AudioDriverPanelProps,
    AnimationDriverPanelProps,
    DriverPanelLayoutMode,
    MidiDriverPanelProps,
  } from './AudioSignalPicker.types';
  import AudioDriverPanelContent from './AudioDriverPanelContent.svelte';
  import AudioSignalPickerCompact from './AudioSignalPickerCompact.svelte';
  import AnimationDriverPanelContent from './AnimationDriverPanelContent.svelte';
  import MidiDriverPanelContent from './MidiDriverPanelContent.svelte';
  import FloatingPanel from './FloatingPanel.svelte';
  import { Button, IconSvg } from '../ui';
  import { getSignalIdFromVirtualNodeId } from '../../../utils/virtualNodes';
  import { resolveDriverKindForParam } from '../../../utils/resolveDriverKindForParam';
  import {
    addAudioBand,
    envelopePresetIdForBinding,
    findMidiEnvelopeBindingForParam,
    generateUUID,
    updateAutomationRegion,
  } from '../../../data-model';
  import type { AutomationCurve } from '../../../data-model/types';
  import { sanitizeAutomationCurveKeyframes } from '../timeline/curveEditorKeyframes';
  import {
    detachAnimationDriverForParam,
    detachMidiDriverForParam,
  } from '../../../utils/parameterDriverAttach';
  import { getPrimaryFileId } from '../../../data-model/audioSetupTypes';
  import type { TimelineState } from '../../../runtime/types';
  import type { GetWaveformData } from './AudioSignalPicker.types';
  import type { AudioBandEntry } from '../../../data-model/audioSetupTypes';
  import {
    clampPanelCenterToViewport,
    getParameterDriverPanelFocusClampBox,
    PARAMETER_DRIVER_PANEL_OVERVIEW_CLAMP_BOX,
  } from './floatingPanelPosition';
  import {
    PARAMETER_DRIVER_KIND_OPTIONS,
    getParameterDriverKindMeta,
    parameterDriverKindClass,
    parameterDriverKindIconVariant,
    type ParameterDriverKind,
  } from '../../../utils/parameterDriverKindMeta';
  import { sortEvaluableRegions } from '../../../utils/automationEvaluator';
  import { evaluateAutomationSignalBindingForParam } from '../../../utils/automationSignals';
  import {
    getMidiEnvelopeFrameValueByBindingId,
    syncMidiEnvelopeFrame,
  } from '../../../utils/midiEnvelopeFrameCache';
  import { subscribeParameterValueTick } from '../../stores/parameterValueTickStore';
  import DriverFocusedHeader from './DriverFocusedHeader.svelte';
  import DriverTargetNavButton from './DriverTargetNavButton.svelte';
  import CurveEditorDriverToolbar from './CurveEditorDriverToolbar.svelte';
  import {
    formatDriverBandSourceText,
    resolveDriverTargetDisplay,
  } from './driverTargetDisplay';

  export type { ParameterDriverKind };

  interface Props {
    open: boolean;
    x: number;
    y: number;
    onPositionChange?: (x: number, y: number) => void;
    targetNodeId: string;
    targetParameter: string;
    triggerElement?: HTMLElement | null;
    graph: NodeGraph;
    audioSetup: AudioSetup;
    nodeSpecs: Map<string, NodeSpec>;
    onSelect: (signal: SignalSelectPayload) => void;
    onClose: () => void;
    onAudioSetupChange: (setup: AudioSetup) => void;
    getAudioManager?: () => import('../../../runtime/types').IAudioManager | null;
    onRevealInNodeEditor?: (nodeId: string, paramName: string) => void;
    onGraphUpdate: (graph: NodeGraph) => void;
    getTimelineState?: () => TimelineState | null;
    onSeek?: (timeSeconds: number) => void;
    getWaveformData?: GetWaveformData;
    arrangementImportBusy?: boolean;
    onImportArrangement?: () => void;
    onClearArrangement?: () => void;
    class?: string;
  }

  let {
    open,
    x,
    y,
    onPositionChange,
    targetNodeId,
    targetParameter,
    triggerElement = null,
    graph,
    audioSetup,
    nodeSpecs,
    onSelect,
    onClose,
    onAudioSetupChange,
    getAudioManager,
    onRevealInNodeEditor,
    onGraphUpdate,
    getTimelineState,
    onSeek,
    getWaveformData,
    arrangementImportBusy = false,
    onImportArrangement,
    onClearArrangement,
    class: className = '',
  }: Props = $props();

  const attachedKind = $derived(
    resolveDriverKindForParam(graph, targetNodeId, targetParameter, audioSetup)
  );

  let selectedKind = $state<ParameterDriverKind>('audio');
  let scrollSession = $state(0);
  let wasOpen = $state(false);
  /** When true, keep overview layout even though a driver is attached (browse / swap). */
  let userPinnedOverview = $state(false);
  let lastClampedLayoutKey = $state<string | null>(null);
  const layoutMode = $derived.by((): DriverPanelLayoutMode => {
    if (!attachedKind || userPinnedOverview) return 'overview';
    return 'focused';
  });

  const focusedKind = $derived((attachedKind ?? selectedKind) as ParameterDriverKind);

  $effect(() => {
    if (open && !wasOpen) {
      scrollSession += 1;
      userPinnedOverview = attachedKind == null;
    }
    wasOpen = open;
  });

  let lastAttachedKind = $state<ParameterDriverKind | null>(null);

  $effect(() => {
    if (!open) {
      lastAttachedKind = null;
      return;
    }
    const current = attachedKind;
    if (current != null && lastAttachedKind !== current) {
      userPinnedOverview = false;
    }
    lastAttachedKind = current;
  });

  $effect(() => {
    if (!open) return;
    const attached = resolveDriverKindForParam(
      graph,
      targetNodeId,
      targetParameter,
      audioSetup
    );
    selectedKind = attached ?? selectedKind;
  });

  $effect(() => {
    if (!open || !onPositionChange) return;
    const clampKey =
      layoutMode === 'overview' ? 'overview' : `focused:${focusedKind}`;
    if (clampKey === lastClampedLayoutKey) return;
    lastClampedLayoutKey = clampKey;
    const box =
      layoutMode === 'focused'
        ? getParameterDriverPanelFocusClampBox(focusedKind)
        : PARAMETER_DRIVER_PANEL_OVERVIEW_CLAMP_BOX;
    const clamped = clampPanelCenterToViewport({ x, y }, box.width, box.height, 16);
    if (clamped.x !== x || clamped.y !== y) {
      onPositionChange(clamped.x, clamped.y);
    }
  });

  const targetNode = $derived(graph.nodes.find((n) => n.id === targetNodeId));
  const nodeSpec = $derived(targetNode ? nodeSpecs.get(targetNode.type) : undefined);
  const paramSpec = $derived(nodeSpec?.parameters?.[targetParameter]);
  const parameterTitle = $derived.by(() => {
    const nodeLabel =
      targetNode?.label?.trim() ||
      nodeSpec?.displayName ||
      targetNode?.type ||
      'Parameter';
    const paramLabel = paramSpec?.label ?? targetParameter;
    return `${nodeLabel} · ${paramLabel}`;
  });

  const hasArrangementSnapshot = $derived(audioSetup.arrangementSnapshot != null);

  const connection = $derived(
    graph.connections.find(
      (c) => c.targetNodeId === targetNodeId && c.targetParameter === targetParameter
    )
  );

  const audioConnectionInfo = $derived.by(() => {
    if (!connection) return null;
    const signalId = getSignalIdFromVirtualNodeId(connection.sourceNodeId);
    let focusRemapperId: string | null = null;
    if (signalId.startsWith('remap-')) {
      focusRemapperId = signalId.slice(6);
    }
    return {
      connectionId: connection.id,
      connectedSignalId: signalId,
      focusRemapperId,
      initialBandId:
        signalId.endsWith('-raw') && signalId.startsWith('band-')
          ? signalId.slice(5, -4)
          : null,
    };
  });

  function handleClose() {
    onClose();
  }

  let deleteHandler = $state<(() => void) | null>(null);
  let animationCompactAdvancedOpen = $state(false);
  let focusedLiveValue = $state<number | null>(null);

  const openTargetDisplay = $derived(
    resolveDriverTargetDisplay(graph, nodeSpecs, targetNodeId, targetParameter)
  );

  const animationLane = $derived(
    graph.automation?.lanes.find(
      (l) => l.nodeId === targetNodeId && l.paramName === targetParameter
    ) ?? null
  );

  const layoutModeProp = $derived(layoutMode);

  const animationEvaluableRegions = $derived(
    animationLane ? sortEvaluableRegions(animationLane) : []
  );
  const animationPrimaryRegion = $derived(animationEvaluableRegions[0] ?? null);
  const animationCurve = $derived(animationPrimaryRegion?.curve ?? null);

  const audioFocusedSourceText = $derived.by(() => {
    if (!audioConnectionInfo) return null;
    const signalId = audioConnectionInfo.connectedSignalId;
    if (signalId.startsWith('remap-')) {
      const remapperId = signalId.slice(6);
      const remapper = audioSetup.remappers.find((r) => r.id === remapperId);
      const band = remapper
        ? audioSetup.bands.find((b) => b.id === remapper.bandId)
        : undefined;
      return band ? formatDriverBandSourceText(band) : null;
    }
    if (signalId.endsWith('-raw') && signalId.startsWith('band-')) {
      const bandId = signalId.slice(5, -4);
      const band = audioSetup.bands.find((b) => b.id === bandId);
      return band ? formatDriverBandSourceText(band) : null;
    }
    return null;
  });

  function handleAnimationCurveChange(newCurve: AutomationCurve) {
    if (!animationLane || !animationPrimaryRegion) return;
    const sanitized: AutomationCurve = {
      ...newCurve,
      keyframes: sanitizeAutomationCurveKeyframes(newCurve.keyframes ?? []),
    };
    onGraphUpdate(
      updateAutomationRegion(graph, animationLane.id, animationPrimaryRegion.id, {
        curve: sanitized,
      })
    );
  }

  $effect(() => {
    if (!open || layoutMode !== 'focused') {
      focusedLiveValue = null;
      return;
    }
    return subscribeParameterValueTick(() => {
      if (focusedKind === 'midi' && midiBinding) {
        const snap = audioSetup.arrangementSnapshot;
        if (!snap) {
          focusedLiveValue = null;
          return;
        }
        const t = getTimelineState?.()?.currentTime ?? 0;
        syncMidiEnvelopeFrame(graph, snap, t);
        focusedLiveValue = getMidiEnvelopeFrameValueByBindingId(midiBinding.id) ?? null;
        return;
      }
      if (focusedKind === 'animation' && targetNode && paramSpec) {
        const t = getTimelineState?.()?.currentTime ?? 0;
        const { value } = evaluateAutomationSignalBindingForParam(
          targetNode,
          targetParameter,
          graph,
          t,
          paramSpec
        );
        focusedLiveValue = value ?? null;
        return;
      }
      if (focusedKind === 'audio' && audioConnectionInfo) {
        const am = getAudioManager?.();
        const signalId = audioConnectionInfo.connectedSignalId;
        if (signalId.startsWith('remap-') && am?.getPanelBandLiveValues) {
          const remapperId = signalId.slice(6);
          const remapper = audioSetup.remappers.find((r) => r.id === remapperId);
          if (remapper) {
            const live = am.getPanelBandLiveValues(remapper.bandId, {
              inMin: remapper.inMin,
              inMax: remapper.inMax,
              outMin: remapper.outMin,
              outMax: remapper.outMax,
            });
            focusedLiveValue = live?.outgoing ?? null;
            return;
          }
        }
      }
      focusedLiveValue = null;
    });
  });

  const audioDriverProps = $derived({
    targetNodeId,
    targetParameter,
    graph,
    audioSetup,
    nodeSpecs,
    onSelect,
    onAudioSetupChange,
    getAudioManager,
    initialBandId: audioConnectionInfo?.initialBandId ?? undefined,
    focusRemapperId: audioConnectionInfo?.focusRemapperId ?? undefined,
    connectionId: audioConnectionInfo?.connectionId ?? undefined,
    registerDeleteHandler: (handler: (() => void) | null) => {
      deleteHandler = handler;
    },
    onRevealInNodeEditor,
    layoutMode: layoutModeProp,
    onNewBand: handleNewBand,
  } satisfies AudioDriverPanelProps);

  const animationDriverProps = $derived({
    targetNodeId,
    targetParameter,
    parameterTitle,
    graph,
    nodeSpecs,
    onGraphUpdate,
    getTimelineState,
    onSeek,
    getWaveformData,
    registerDeleteHandler: (handler: (() => void) | null) => {
      deleteHandler = handler;
    },
    onRevealInNodeEditor,
    layoutMode: layoutModeProp,
    onReturnToFocusedEdit: returnToFocusedEdit,
    hideCurveToolbar: layoutModeProp === 'focused',
  } satisfies AnimationDriverPanelProps);

  const midiBinding = $derived(
    findMidiEnvelopeBindingForParam(graph, targetNodeId, targetParameter) ?? null
  );

  const midiConnectionInfo = $derived.by(() => {
    if (!midiBinding) return null;
    return {
      focusRemapperId: midiBinding.remapperId,
      initialPresetId: envelopePresetIdForBinding(graph, midiBinding) ?? null,
    };
  });

  const midiDriverProps = $derived({
    targetNodeId,
    targetParameter,
    parameterTitle,
    graph,
    nodeSpecs,
    audioSetup,
    onGraphUpdate,
    getTimelineState,
    focusRemapperId: midiConnectionInfo?.focusRemapperId ?? undefined,
    initialPresetId: midiConnectionInfo?.initialPresetId ?? undefined,
    registerDeleteHandler: (handler: (() => void) | null) => {
      deleteHandler = handler;
    },
    layoutMode: layoutModeProp,
    onRevealInNodeEditor,
    onDriverAttached: () => {
      userPinnedOverview = false;
    },
    onClose: handleClose,
    onBrowseOverview: openOverview,
    arrangementImportBusy,
    onImportArrangement,
  } satisfies MidiDriverPanelProps);

  function kindIsDisabled(kind: ParameterDriverKind): boolean {
    // MIDI tab stays enabled without arrangement/project data; empty state prompts Fetch project.
    if (kind === 'midi') {
      return paramSpec?.type !== 'float';
    }
    if (kind === 'animation' && (paramSpec?.type !== 'float' || paramSpec?.supportsAnimation === false)) {
      return true;
    }
    if (kind === 'audio' && paramSpec?.supportsAudio === false) return true;
    return false;
  }

  function kindDisabledTitle(kind: ParameterDriverKind): string | undefined {
    if (kind === 'midi') {
      if (paramSpec?.type !== 'float') {
        return 'MIDI drivers apply to float parameters only';
      }
      return undefined;
    }
    if (kind === 'animation' && (paramSpec?.type !== 'float' || paramSpec?.supportsAnimation === false)) {
      return paramSpec?.type !== 'float'
        ? 'Animation drivers apply to float parameters only'
        : 'This parameter does not support animation drivers';
    }
    if (kind === 'audio' && paramSpec?.supportsAudio === false) {
      return 'This parameter does not support audio drivers';
    }
    return undefined;
  }

  function selectKind(kind: ParameterDriverKind) {
    if (kindIsDisabled(kind)) return;
    selectedKind = kind;
  }

  function openOverview() {
    userPinnedOverview = true;
    if (attachedKind) selectedKind = attachedKind;
    scrollSession += 1;
  }

  function returnToFocusedEdit() {
    userPinnedOverview = false;
    scrollSession += 1;
  }

  const browseButtonTitle = $derived.by(() => {
    if (attachedKind === 'animation') {
      return 'Browse driver types. Animation curves belong to this parameter only — use Remove curve to delete.';
    }
    if (attachedKind === 'audio' || attachedKind === 'midi') {
      return 'Browse the preset library, connect another remap or track set, or switch driver type with the tabs below.';
    }
    return 'Browse driver types and connect audio or MIDI remaps from the library.';
  });

  function handleDisconnectDriver() {
    if (attachedKind === 'audio') {
      const info = audioConnectionInfo;
      if (!info?.connectionId) return;
      onSelect({ type: 'disconnect', connectionId: info.connectionId });
      handleClose();
      return;
    }
    if (attachedKind === 'animation') {
      onGraphUpdate(detachAnimationDriverForParam(graph, targetNodeId, targetParameter));
      handleClose();
      return;
    }
    if (attachedKind === 'midi') {
      onGraphUpdate(detachMidiDriverForParam(graph, targetNodeId, targetParameter));
      handleClose();
    }
  }

  const canDisconnectDriver = $derived.by(() => {
    if (attachedKind === 'audio') return !!audioConnectionInfo?.connectionId;
    if (attachedKind === 'animation') return animationLane != null;
    if (attachedKind === 'midi') return midiBinding != null;
    return false;
  });

  const disconnectFooterLabel = $derived(
    attachedKind === 'animation' ? 'Remove curve' : 'Disconnect'
  );

  const disconnectDriverTitle = $derived.by(() => {
    if (!canDisconnectDriver) return 'No driver attached';
    if (attachedKind === 'midi') {
      return 'Disconnect MIDI driver from this parameter (track set stays in the project)';
    }
    if (attachedKind === 'animation') {
      return 'Remove animation curve from this parameter';
    }
    if (attachedKind === 'audio') return 'Disconnect audio driver from this parameter';
    return 'Disconnect driver from this parameter';
  });

  const hasFiles = $derived(!!getPrimaryFileId(audioSetup));

  function nextBandIndex(bands: readonly AudioBandEntry[]): number {
    let max = 0;
    for (const b of bands) {
      const t = b.name.trim();
      if (!/^\d+$/.test(t)) continue;
      const n = Number.parseInt(t, 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
    return (max || bands.length) + 1;
  }

  function handleNewBand() {
    const primaryId = getPrimaryFileId(audioSetup);
    if (!primaryId) return;
    const n = nextBandIndex(audioSetup.bands);
    const newBand: AudioBandEntry = {
      id: `band-${generateUUID()}`,
      name: String(n).padStart(2, '0'),
      sourceFileId: primaryId,
      frequencyBands: [[20, 20000]],
      attackHalfLifeSeconds: 1 / 120,
      releaseHalfLifeSeconds: 1 / 120,
      fftSize: 2048,
    };
    onAudioSetupChange(addAudioBand(audioSetup, newBand));
  }


  const INPUT_LIKE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest(INPUT_LIKE_SELECTOR)) return;
      e.preventDefault();
      handleClose();
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest(INPUT_LIKE_SELECTOR)) return;
      // Focused audio: no keyboard delete (disconnect via footer only).
      if (layoutMode === 'focused' && attachedKind === 'audio') return;
      if (deleteHandler) {
        deleteHandler();
        e.preventDefault();
      }
    }
  }

  const focusedHeadlineMeta = $derived(
    layoutMode === 'focused' && attachedKind
      ? getParameterDriverKindMeta(attachedKind)
      : null
  );

  const ariaLabel = $derived(
    focusedHeadlineMeta
      ? `${focusedHeadlineMeta.label} driver for ${parameterTitle}`
      : `Parameter drivers for ${parameterTitle}`
  );

  const useCompactAudio = $derived(
    layoutMode === 'focused' &&
      selectedKind === 'audio' &&
      attachedKind === 'audio' &&
      audioConnectionInfo != null
  );

  const useCompactMidi = $derived(
    layoutMode === 'focused' &&
      selectedKind === 'midi' &&
      attachedKind === 'midi' &&
      midiBinding != null
  );

  const isFocusedDriverShell = $derived(
    layoutMode === 'focused' &&
      (selectedKind === 'midi' ||
        (selectedKind === 'audio' && useCompactAudio) ||
        selectedKind === 'animation')
  );

  const toolbarEndHasContent = $derived(!isFocusedDriverShell && layoutMode === 'focused');

  const showArrangementImport = $derived(
    selectedKind === 'midi' && onImportArrangement != null
  );
</script>

{#snippet kindTabs()}
  <nav class="kind-tabs" aria-label="Driver type">
    {#each PARAMETER_DRIVER_KIND_OPTIONS as kind (kind.id)}
      {@const disabled = kindIsDisabled(kind.id)}
      {@const selected = selectedKind === kind.id}
      <button
        type="button"
        class="driver-kind-tab {parameterDriverKindClass(kind.id)}"
        class:is-selected={selected}
        disabled={disabled}
        title={kindDisabledTitle(kind.id)}
        aria-current={selected ? 'true' : undefined}
        onclick={() => selectKind(kind.id)}
      >
        <IconSvg name={kind.icon} variant={kind.iconVariant ?? 'line'} />
        <span>{kind.label}</span>
      </button>
    {/each}
  </nav>
{/snippet}

{#snippet driverFooter()}
  <div class="driver-footer-actions">
    <Button
      variant="warning"
      size="sm"
      mode="both"
      disabled={!canDisconnectDriver}
      title={disconnectDriverTitle}
      aria-label={disconnectDriverTitle}
      onclick={handleDisconnectDriver}
    >
      <IconSvg name={attachedKind === 'animation' ? 'trash' : 'prohibit'} variant="line" />
      {disconnectFooterLabel}
    </Button>
    <Button
      variant="ghost"
      size="sm"
      mode="both"
      title={browseButtonTitle}
      aria-label={browseButtonTitle}
      onclick={openOverview}
    >
      <IconSvg name="swap" variant="line" />
      Browse
    </Button>
  </div>
{/snippet}

<FloatingPanel
  {open}
  {x}
  {y}
  {triggerElement}
  closeOnClickOutside={false}
  onClose={handleClose}
  {onPositionChange}
  onKeydown={handleKeydown}
  {ariaLabel}
  dragSurface="grip-only"
  class="parameter-driver-panel is-{layoutMode} driver-shell-{focusedKind} {className}"
  mainOverflow="hidden"
  footer={isFocusedDriverShell ? driverFooter : undefined}
>
  {#snippet headerInset()}
    <div class="panel-headline">
      {#if focusedHeadlineMeta}
        <div
          class="panel-headline-text driver-kind-chrome {parameterDriverKindClass(focusedHeadlineMeta.id)}"
          title={focusedHeadlineMeta.label}
        >
          <IconSvg
            name={focusedHeadlineMeta.icon}
            variant={parameterDriverKindIconVariant(focusedHeadlineMeta.id)}
          />
          <span>{focusedHeadlineMeta.label}</span>
        </div>
      {:else}
        <div
          class="panel-headline-text"
          title={openTargetDisplay?.fullTitle ?? parameterTitle}
        >
          <span class="panel-headline-heading">Connect:</span>
          {#if openTargetDisplay}
            <DriverTargetNavButton
              target={openTargetDisplay}
              onReveal={onRevealInNodeEditor}
              class="panel-headline-target"
            />
          {:else}
            <span class="panel-headline-param">{parameterTitle}</span>
          {/if}
        </div>
      {/if}
    </div>
  {/snippet}

  {#snippet children()}
    <div
      class="driver-shell"
      class:is-overview={layoutMode === 'overview'}
      class:is-focused={layoutMode === 'focused'}
      class:is-focused-driver-shell={isFocusedDriverShell}
    >
      {#if layoutMode === 'overview' || !isFocusedDriverShell}
        <div class="kind-toolbar">
          {#if layoutMode === 'overview'}
            {@render kindTabs()}
          {/if}
          {#if showArrangementImport || toolbarEndHasContent}
          <div class="toolbar-spacer" aria-hidden="true"></div>
          {#if showArrangementImport}
            <div class="toolbar-middle">
              <Button
                variant="ghost"
                size="sm"
                mode="label-only"
                disabled={arrangementImportBusy}
                title="Fetch arrangement from studio project"
                onclick={() => onImportArrangement?.()}
                aria-busy={arrangementImportBusy}
                aria-label="Fetch"
              >
                {arrangementImportBusy ? 'Fetching…' : 'Fetch'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                mode="label-only"
                disabled={!hasArrangementSnapshot || arrangementImportBusy || !onClearArrangement}
                title={
                  hasArrangementSnapshot
                    ? 'Remove fetched arrangement'
                    : 'No arrangement data loaded'
                }
                aria-label="Remove"
                onclick={() => onClearArrangement?.()}
              >
                Remove
              </Button>
            </div>
          {/if}
          {#if toolbarEndHasContent}
            <div class="toolbar-spacer" aria-hidden="true"></div>
            <div class="toolbar-end">
              {#if layoutMode === 'focused'}
                <Button
                  variant="secondary"
                  size="sm"
                  mode="both"
                  title={browseButtonTitle}
                  aria-label={browseButtonTitle}
                  onclick={openOverview}
                >
                  <IconSvg name="swap" variant="line" />
                  Browse
                </Button>
              {/if}
              {#if layoutMode !== 'overview'}
                <Button
                  variant="warning"
                  size="sm"
                  mode="both"
                  disabled={!canDisconnectDriver}
                  title={disconnectDriverTitle}
                  aria-label={disconnectDriverTitle}
                  onclick={handleDisconnectDriver}
                >
                  <IconSvg name={attachedKind === 'animation' ? 'trash' : 'prohibit'} variant="line" />
                  {disconnectFooterLabel}
                </Button>
              {/if}
            </div>
          {/if}
        {/if}
        </div>
      {/if}

      {#if isFocusedDriverShell && openTargetDisplay && !useCompactAudio && !useCompactMidi}
        <DriverFocusedHeader
          target={openTargetDisplay}
          liveValue={focusedLiveValue}
          onReveal={onRevealInNodeEditor}
        >
          {#snippet trailing()}
            {#if focusedKind === 'audio' && audioFocusedSourceText}
              <span class="focused-source" title={audioFocusedSourceText}>{audioFocusedSourceText}</span>
            {/if}
            {#if focusedKind === 'animation' && animationCurve}
              <CurveEditorDriverToolbar
                curve={animationCurve}
                onCurveChange={handleAnimationCurveChange}
                bind:compactAdvancedOpen={animationCompactAdvancedOpen}
              />
            {/if}
          {/snippet}
        </DriverFocusedHeader>
      {/if}

      <div
        class="kind-main"
        class:driver-body={isFocusedDriverShell}
        class:frame-elevated={isFocusedDriverShell}
        class:scrollbar-no-gutter={isFocusedDriverShell}
      >
        {#if selectedKind === 'audio'}
          <div class="audio-slot" data-slot="audio-driver">
            {#key `${scrollSession}-${layoutMode}`}
              {#if useCompactAudio && audioConnectionInfo}
                <AudioSignalPickerCompact
                  {parameterTitle}
                  targetNodeId={targetNodeId}
                  targetParameter={targetParameter}
                  triggerElement={triggerElement}
                  {graph}
                  {audioSetup}
                  {nodeSpecs}
                  {onSelect}
                  onClose={handleClose}
                  {onAudioSetupChange}
                  {getAudioManager}
                  connectedVirtualNodeId={connection!.sourceNodeId}
                  connectedSignalId={audioConnectionInfo.connectedSignalId}
                  connectionId={audioConnectionInfo.connectionId}
                  {onRevealInNodeEditor}
                />
              {:else}
                <AudioDriverPanelContent {...audioDriverProps} />
              {/if}
            {/key}
          </div>
        {:else if selectedKind === 'animation'}
          <div class="animation-slot" data-slot="animation-driver">
            {#key `${scrollSession}-${layoutMode}`}
              <AnimationDriverPanelContent
                {...animationDriverProps}
                bind:compactAdvancedOpen={animationCompactAdvancedOpen}
              />
            {/key}
          </div>
        {:else if selectedKind === 'midi'}
          <div class="midi-slot" data-slot="midi-driver">
            {#key `${scrollSession}-${layoutMode}`}
              <MidiDriverPanelContent {...midiDriverProps} />
            {/key}
          </div>
        {/if}
      </div>
    </div>
  {/snippet}
</FloatingPanel>

<style>
  :global(.floating-panel.parameter-driver-panel .content) {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  :global(.floating-panel.parameter-driver-panel.is-focused.driver-shell-animation .content) {
    max-width: min(840px, calc(100vw - 32px));
  }

  :global(.floating-panel.parameter-driver-panel.is-focused.driver-shell-audio .content),
  :global(.floating-panel.parameter-driver-panel.is-focused.driver-shell-midi .content) {
    max-width: min(520px, calc(100vw - 32px));
  }

  :global(.floating-panel.parameter-driver-panel.is-overview .content) {
    max-width: min(960px, calc(100vw - 32px));
  }

  .panel-headline {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    padding-inline: var(--pd-xs);
  }

  .panel-headline-text {
    display: flex;
    align-items: center;
    gap: var(--pd-2xs);
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .panel-headline-heading {
    flex-shrink: 0;
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-blue-100);
    line-height: 1;
  }

  :global(.panel-headline-target.driver-target-nav.button.ghost.sm) {
    min-width: 0;
    padding-inline: var(--pd-sm);
  }

  .panel-headline-param {
    min-width: 0;
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-gray-110);
    line-height: 1.25;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .kind-tabs {
    display: flex;
    align-items: center;
    gap: var(--pd-2xs);
    min-width: 0;
    flex-shrink: 0;
    overflow-x: auto;
  }

  .kind-toolbar {
    display: flex;
    align-items: center;
    gap: var(--pd-xs);
    flex-shrink: 0;
    padding: var(--pd-xs) var(--pd-sm);
    border-bottom: 1px solid var(--color-gray-50);
    background: var(--color-gray-20);
    min-width: 0;
  }

  .toolbar-spacer {
    flex: 1;
    min-width: var(--pd-sm);
  }

  .toolbar-middle,
  .toolbar-end {
    display: flex;
    align-items: center;
    gap: var(--pd-xs);
    flex-shrink: 0;
  }

  :global(.driver-shell .focused-source) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--text-xs);
    color: var(--color-gray-100);
  }

  .driver-shell {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    overflow: hidden;

    &.is-overview {
      min-width: 680px;
      max-width: 960px;
      height: 70vh;
      min-height: 420px;
      max-height: 70vh;
    }

  }

  :global(.floating-panel.parameter-driver-panel.is-focused.driver-shell-animation) .driver-shell.is-focused {
    min-width: 560px;
    max-width: 840px;
    width: min(840px, calc(100vw - 32px));
    height: min(720px, 80vh);
    min-height: 520px;
    max-height: min(720px, 80vh);
  }

  :global(.floating-panel.parameter-driver-panel.is-focused.driver-shell-audio) .driver-shell.is-focused,
  :global(.floating-panel.parameter-driver-panel.is-focused.driver-shell-midi) .driver-shell.is-focused {
    min-width: 420px;
    max-width: 520px;
    width: min(520px, calc(100vw - 32px));
    max-height: min(560px, 70vh);
  }

  .driver-shell.is-focused-driver-shell {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .kind-main.driver-body.frame-elevated {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    padding: 0;
  }

  :global(.floating-panel.parameter-driver-panel.is-focused .footer) {
    flex-shrink: 0;
    padding: var(--pd-md);
  }

  .driver-footer-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--pd-md);
    width: 100%;
  }

  .kind-main {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    flex: 1;
    overflow: hidden;
  }

  .audio-slot {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  .animation-slot {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  .midi-slot {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  .kind-placeholder {
    flex: 1;
    padding: var(--pd-xl);
  }
</style>
