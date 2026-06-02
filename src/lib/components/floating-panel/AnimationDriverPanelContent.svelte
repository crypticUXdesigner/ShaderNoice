<script lang="ts">

  /**

   * Animation driver panel — parameter-drivers-v1 02B.

   * Add / edit / remove transport curve for one float parameter without opening the timeline panel.

   */

  import { Button, IconSvg } from '../ui';

  import DriverPanelEmptyState from './DriverPanelEmptyState.svelte';

  import TimelineCurveEditor from '../timeline/TimelineCurveEditor.svelte';

  import type { AnimationDriverPanelProps } from './AudioSignalPicker.types';

  import {

    addDefaultAutomationDriverForParam,

    generateUUID,

    removeAutomationLane,

  } from '../../../data-model';

  import { sortEvaluableRegions } from '../../../utils/automationEvaluator';

  import { prepareGraphForAnimationDriverAttach } from '../../../utils/parameterDriverAttach';

  import { getParameterDriverKindMeta } from '../../../utils/parameterDriverKindMeta';

  const animationKindIcon = getParameterDriverKindMeta('animation');



  let {

    targetNodeId,

    targetParameter,

    parameterTitle,

    graph,

    nodeSpecs,

    onGraphUpdate,

    getTimelineState,

    onSeek,

    getWaveformData,

    registerDeleteHandler,

    onRevealInNodeEditor,

    layoutMode = 'overview',

    onReturnToFocusedEdit,
    compactAdvancedOpen = $bindable(false),
    hideCurveToolbar = false,

  }: AnimationDriverPanelProps = $props();



  const targetNode = $derived(graph.nodes.find((n) => n.id === targetNodeId));

  const nodeSpec = $derived(targetNode ? nodeSpecs.get(targetNode.type) : undefined);

  const paramSpec = $derived(nodeSpec?.parameters?.[targetParameter]);



  const lane = $derived(

    graph.automation?.lanes.find(

      (l) => l.nodeId === targetNodeId && l.paramName === targetParameter

    ) ?? null

  );



  const evaluableRegions = $derived(lane ? sortEvaluableRegions(lane) : []);

  const hasEvaluableDriver = $derived(evaluableRegions.length > 0);

  const primaryRegion = $derived(evaluableRegions[0] ?? null);



  const paramLabel = $derived(paramSpec?.label ?? targetParameter);

  const nodeSpecsList = $derived([...nodeSpecs.values()]);

  const isFocusedLayout = $derived(layoutMode === 'focused');

  const isOverviewLayout = $derived(layoutMode === 'overview');



  function handleAddAnimationDriver() {

    if (!targetNode || paramSpec?.type !== 'float') return;

    const transportDuration = getTimelineState?.()?.duration ?? null;

    const prepared = prepareGraphForAnimationDriverAttach(graph, targetNodeId, targetParameter);

    const updated = addDefaultAutomationDriverForParam(

      prepared,

      targetNodeId,

      targetParameter,

      generateUUID(),

      generateUUID(),

      targetNode,

      paramSpec,

      { transportDurationSeconds: transportDuration }

    );

    onGraphUpdate(updated);

    onReturnToFocusedEdit?.();

  }



  /** Remove animation driver: drop the whole lane (regions are owned by the lane). */

  function handleRemoveAnimationDriver() {

    if (!lane) return;

    onGraphUpdate(removeAutomationLane(graph, lane.id));

  }



  $effect(() => {

    registerDeleteHandler?.(lane ? handleRemoveAnimationDriver : null);

    return () => registerDeleteHandler?.(null);

  });

</script>



<div class="animation-driver-panel" class:is-focused-layout={isFocusedLayout}>

  {#if hasEvaluableDriver && lane && primaryRegion}

    {#if isFocusedLayout}

      <div class="animation-driver-card is-embedded">

        <div class="editor-wrap">

          <TimelineCurveEditor

            embedded

            compactDriverMode

            hideToolbar={hideCurveToolbar}

            bind:compactAdvancedOpen

            getGraph={() => graph}

            {onGraphUpdate}

            onClose={() => {}}

            laneId={lane.id}

            regionId={primaryRegion.id}

            {paramLabel}

            {onRevealInNodeEditor}

            nodeSpecs={nodeSpecsList}

            {getWaveformData}

            getCurrentTransportTime={() => getTimelineState?.()?.currentTime ?? 0}

            {onSeek}

          />

        </div>

      </div>

    {:else if isOverviewLayout}

      <DriverPanelEmptyState
        icon={animationKindIcon.icon}
        iconVariant={animationKindIcon.iconVariant ?? 'line'}
        driverKind="animation"
        title="No shared animation presets"
        copy="This parameter already has its own transport curve. Animation drivers are not shared like audio or MIDI remaps — each float port owns one lane. Use the tabs above to browse audio or MIDI track sets, or return to edit this curve."
        secondaryHint="Optional: open the timeline panel for multi-lane overview."
        spacious
      >
        {#snippet primaryAction()}
          <Button
            variant="primary"
            size="md"
            mode="both"
            onclick={() => onReturnToFocusedEdit?.()}
          >
            <IconSvg name="pencil-simple" variant="line" />
            Edit curve
          </Button>
        {/snippet}
      </DriverPanelEmptyState>

    {:else}

      <div class="curve-editor-slot">

        <TimelineCurveEditor

          getGraph={() => graph}

          {onGraphUpdate}

          onClose={() => {}}

          laneId={lane.id}

          regionId={primaryRegion.id}

          {paramLabel}

          {onRevealInNodeEditor}

          nodeSpecs={nodeSpecsList}

          {getWaveformData}

          getCurrentTransportTime={() => getTimelineState?.()?.currentTime ?? 0}

          {onSeek}

        />

      </div>

      <div class="driver-actions">

        <Button

          variant="warning"

          size="sm"

          mode="both"

          title="Remove animation curve from this parameter"

          aria-label="Remove curve"

          onclick={handleRemoveAnimationDriver}

        >

          <IconSvg name="trash" variant="line" />

          Remove curve

        </Button>

      </div>

    {/if}

  {:else}

    <DriverPanelEmptyState
      icon={animationKindIcon.icon}
      iconVariant={animationKindIcon.iconVariant ?? 'line'}
      driverKind="animation"
      title="No animation driver"
      copy="Add a transport curve for this parameter. A full-length region is created at the current value. There is no shared preset library — the curve belongs to this port only."
      secondaryHint="Optional: open the timeline panel for multi-lane overview."
      spacious
    >
      {#snippet primaryAction()}
        <Button variant="primary" size="md" mode="both" onclick={handleAddAnimationDriver}>
          <IconSvg name="plus" variant="line" />
          Add animation driver
        </Button>
      {/snippet}
    </DriverPanelEmptyState>

  {/if}

</div>



<style>

  .animation-driver-panel {

    display: flex;

    flex-direction: column;

    flex: 1;

    min-height: 0;

    min-width: 0;

    overflow-y: auto;



    &.is-focused-layout {

      overflow: hidden;

    }

  }



  .animation-driver-card.is-embedded {

    display: flex;

    flex-direction: column;

    width: 100%;

    flex: 1;

    min-height: 0;

    box-sizing: border-box;

    padding-bottom: 0;

    background: transparent;

    border: none;



    .editor-wrap {

      display: flex;

      flex-direction: column;

      flex: 1;

      min-height: 0;

      padding: 0 var(--pd-md) var(--pd-sm);

      overflow: hidden;

    }

  }



  .curve-editor-slot {

    display: flex;

    flex-direction: column;

    flex: 0 0 auto;

    min-height: 0;

    min-width: 0;

    overflow: hidden;

    padding: var(--pd-sm) var(--pd-md) 0;

  }



  .curve-editor-slot :global(.curve-editor) {

    flex: 0 0 auto;

    border-radius: var(--radius-md);

    overflow: hidden;

  }



  .curve-editor-slot :global(.curve-editor),
  .animation-driver-card.is-embedded :global(.curve-editor) {
    flex: 1;
    min-height: 0;
  }

  .curve-editor-slot :global(.graph-wrap),
  .animation-driver-card.is-embedded :global(.graph-wrap) {
    flex: 1;
    min-height: 200px;
    max-height: none;
    aspect-ratio: unset;
  }



  .driver-actions {

    display: flex;

    justify-content: flex-end;

    flex-shrink: 0;

    padding: var(--pd-sm) var(--pd-md);

    border-top: 1px solid var(--color-gray-50);

    background: var(--color-gray-20);

  }



</style>

