<script lang="ts">
  import { Button, IconSvg, NodeIconSvg } from '../ui';
  import { automationLaneHasEvaluableRegions } from '../../../utils/automationEvaluator';
  import { getAutomationHoldSpanTimeRanges } from './timelineAutomationHoldSpans';
  import { getNodeIcon } from '../../../utils/nodeSpecUtils';
  import type { TimelineLaneRowViewModel } from './timelineLaneViewModel';

  type RegionKey = { laneId: string; regionId: string };

  export type LaneViewModel = TimelineLaneRowViewModel;

  interface Props {
    laneVMs: LaneViewModel[];
    trackGridLines: number[];
    selectedRegion: RegionKey | null;
    regionDrag: { laneId: string; regionId: string; startTime: number } | null;
    regionResize: { laneId: string; regionId: string; startTime: number; startDuration: number } | null;
    timeToX: (t: number) => number;

    showPlayhead: boolean;
    playheadDragging: boolean;
    playheadX: number;
    duration: number;
    currentTime: number;
    rulerSeekEnabled: boolean;

    onDeleteLane: (laneId: string) => void;
    onTrackDblClick: (e: MouseEvent, laneId: string) => void;
    onRegionMouseDown: (e: MouseEvent, laneId: string, regionId: string) => void;
    onRegionContextMenu: (e: MouseEvent, laneId: string, regionId: string) => void;
    onRegionDblClick?: (laneId: string, regionId: string) => void;
    onRegionResizeStart: (e: MouseEvent, laneId: string, regionId: string, edge: 'left' | 'right') => void;
    onPlayheadPointerDown: (e: PointerEvent) => void;

    onTrackColumnEl?: (el: HTMLDivElement | null) => void;
    onLanesContainerEl?: (el: HTMLDivElement | null) => void;
    onPlayheadClipEl?: (el: HTMLDivElement | null) => void;

    footerRight?: import('svelte').Snippet<[]>;
  }

  let {
    laneVMs,
    trackGridLines,
    selectedRegion,
    regionDrag,
    regionResize,
    timeToX,
    showPlayhead,
    playheadDragging,
    playheadX,
    duration,
    currentTime,
    rulerSeekEnabled,
    onDeleteLane,
    onTrackDblClick,
    onRegionMouseDown,
    onRegionContextMenu,
    onRegionDblClick,
    onRegionResizeStart,
    onPlayheadPointerDown,
    onTrackColumnEl,
    onLanesContainerEl,
    onPlayheadClipEl,
    footerRight,
  }: Props = $props();

  let trackColumnEl: HTMLDivElement | null = $state(null);
  let lanesContainerEl: HTMLDivElement | null = $state(null);
  let playheadClipEl: HTMLDivElement | null = $state(null);

  $effect(() => {
    onTrackColumnEl?.(trackColumnEl);
  });
  $effect(() => {
    onLanesContainerEl?.(lanesContainerEl);
  });
  $effect(() => {
    onPlayheadClipEl?.(playheadClipEl);
  });
</script>

<div class="timeline-shell">
  <div class="timeline-main">
    <div class="track-headers-col">
      {#each laneVMs as vm (vm.lane.id)}
        <div class="lane-header" data-lane-id={vm.lane.id}>
          <div class="lane-label">
            {#if vm.spec}
              <div class="lane-label-icon">
                <NodeIconSvg identifier={getNodeIcon(vm.spec)} />
              </div>
            {/if}
            <div
              class="lane-label-text-col"
              title={`${vm.paramLabel} — ${vm.nodeLabel}. Automation applies along the whole timeline (lead-in before the first region, hold in gaps, tail after the last region; looping repeats until the next region).`}
            >
              <div class="lane-label-param-row">
                <span class="lane-label-param">{vm.paramLabel}</span>
                {#if automationLaneHasEvaluableRegions(vm.lane)}
                  <span class="lane-timeline-hint" aria-hidden="true">
                    <IconSvg name="wave-sine" variant="line" class="lane-timeline-hint-icon" />
                  </span>
                {/if}
              </div>
              <span class="lane-label-node">{vm.nodeLabel}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            mode="icon-only"
            class="delete-lane-btn"
            title="Delete lane"
            onclick={(e: MouseEvent) => {
              e.stopPropagation();
              onDeleteLane(vm.lane.id);
            }}
          >
            <IconSvg name="circle-x" variant="filled" />
          </Button>
        </div>
      {/each}
    </div>

    <div bind:this={trackColumnEl} class="lanes-tracks-wrap">
      <div bind:this={lanesContainerEl} class="lanes-inner">
        {#each laneVMs as vm (vm.lane.id)}
          <div class="lane-row" data-lane-id={vm.lane.id}>
            <div class="track-wrap">
              <div
                class="track"
                data-lane-id={vm.lane.id}
                role="button"
                tabindex={0}
                ondblclick={(e: MouseEvent) => onTrackDblClick(e, vm.lane.id)}
              >
                <div class="track-grid" aria-hidden="true">
                  {#each trackGridLines as x (x)}
                    <div class="track-grid-line" style="left: {x}px"></div>
                  {/each}
                </div>
                {#if automationLaneHasEvaluableRegions(vm.lane)}
                  {#each getAutomationHoldSpanTimeRanges(vm.lane, duration) as span, idx (`hold-${vm.lane.id}-${span.start}-${span.end}-${idx}`)}
                    {@const gLeft = timeToX(span.start)}
                    {@const gRight = timeToX(span.end)}
                    {@const gW = Math.max(1, gRight - gLeft)}
                    <div
                      class="automation-hold-ghost"
                      data-category={vm.categorySlug}
                      data-subgroup={vm.subGroupSlug || undefined}
                      style="left: {gLeft}px; width: {gW}px"
                      aria-hidden="true"
                      title="Automation holds the endpoint value here (before first region, between regions, or after the last)."
                    ></div>
                  {/each}
                {/if}
                {#each vm.lane.regions as region (region.id)}
                  {@const isDragging = regionDrag?.laneId === vm.lane.id && regionDrag?.regionId === region.id}
                  {@const isResizing = regionResize?.laneId === vm.lane.id && regionResize?.regionId === region.id}
                  {@const displayStart = isDragging ? regionDrag!.startTime : isResizing ? regionResize!.startTime : region.startTime}
                  {@const displayDuration = isResizing ? regionResize!.startDuration : region.duration}
                  {@const left = timeToX(displayStart)}
                  {@const right = timeToX(displayStart + displayDuration)}
                  {@const w = Math.max(2, right - left)}
                  <div
                    class="region-block"
                    data-lane-id={vm.lane.id}
                    data-region-id={region.id}
                    data-category={vm.categorySlug}
                    data-subgroup={vm.subGroupSlug || undefined}
                    class:is-selected={selectedRegion?.laneId === vm.lane.id && selectedRegion?.regionId === region.id}
                    style="left: {left}px; width: {w}px"
                    role="button"
                    tabindex={0}
                    onmousedown={(e: MouseEvent) => onRegionMouseDown(e, vm.lane.id, region.id)}
                    oncontextmenu={(e: MouseEvent) => onRegionContextMenu(e, vm.lane.id, region.id)}
                    ondblclick={(e: MouseEvent) => {
                      e.stopPropagation();
                      onRegionDblClick?.(vm.lane.id, region.id);
                    }}
                  >
                    <div
                      class="region-resize region-resize-left"
                      title="Resize left"
                      role="button"
                      aria-label="Resize left edge"
                      tabindex={0}
                      onmousedown={(e) => onRegionResizeStart(e, vm.lane.id, region.id, 'left')}
                    ></div>
                    <div
                      class="region-resize region-resize-right"
                      title="Resize right"
                      role="button"
                      aria-label="Resize right edge"
                      tabindex={0}
                      onmousedown={(e) => onRegionResizeStart(e, vm.lane.id, region.id, 'right')}
                    ></div>
                    <div class="region-title">
                      <span class="region-title-param">{vm.paramLabel}</span>
                      <span class="region-title-node">{vm.nodeLabel}</span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {/each}
        {#if showPlayhead}
          <div bind:this={playheadClipEl} class="playhead-clip" aria-hidden="true">
            <div
              class="playhead-handle"
              class:is-dragging={playheadDragging}
              style="left: {playheadX - 6}px"
              role="slider"
              tabindex={rulerSeekEnabled ? 0 : -1}
              aria-label="Playhead position"
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={currentTime}
              title="Drag to scrub or set play position"
              onpointerdown={onPlayheadPointerDown}
            >
              <div class="playhead"></div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>

  {#if footerRight}
    <div class="timeline-footer">
      <div class="footer-corner" aria-hidden="true"></div>
      <div class="timeline-footer-tracks">
        {@render footerRight()}
      </div>
    </div>
  {/if}
</div>

<style>
  .timeline-shell {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .timeline-main {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 0;
  }

  .track-headers-col {
    flex-shrink: 0;
    width: var(--track-header-width);
    display: flex;
    flex-direction: column;
    gap: var(--pd-sm);
    padding: var(--pd-xs) 0 var(--pd-xs) var(--pd-xs);
    box-sizing: border-box;
  }

  .timeline-footer {
    flex-shrink: 0;
    display: flex;
    flex-direction: row;
    align-items: stretch;
  }

  .footer-corner {
    flex-shrink: 0;
    width: var(--track-header-width);
    box-sizing: border-box;
    padding-left: var(--pd-xs);
  }

  .timeline-footer-tracks {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--pd-xs);
    padding: 0 var(--pd-xs) var(--pd-xs);
    box-sizing: border-box;
    background: var(--color-gray-60);
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    overflow: hidden;
  }

  .lane-header {
    display: flex;
    align-items: center;
    gap: var(--pd-xs);
    padding: 0 var(--pd-md);
    min-height: var(--size-md);
  }

  .lane-label {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: var(--pd-sm);
    padding: var(--pd-xs) 0;
    color: var(--print-highlight);
  }

  .lane-label-icon {
    flex-shrink: 0;
    width: var(--icon-size-sm);
    height: var(--icon-size-sm);
  }

  .lane-label-icon :global(svg) {
    width: 100%;
    height: 100%;
    display: block;
  }

  .lane-label-text-col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    line-height: 1.15;
  }

  .lane-label-param-row {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  .lane-label-param {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--print-highlight);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
  }

  .lane-timeline-hint {
    flex-shrink: 0;
    display: inline-flex;
    opacity: 0.75;
    color: var(--color-teal-110, var(--print-subtle));
  }

  :global(.lane-timeline-hint-icon) {
    width: 12px;
    height: 12px;
  }

  .lane-label-node {
    font-size: var(--text-2xs);
    font-weight: 500;
    color: var(--print-subtle);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  :global(.delete-lane-btn) {
    flex-shrink: 0;
  }

  .lanes-tracks-wrap {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--color-gray-60);
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    overflow: hidden;
  }

  .lanes-inner {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: var(--pd-sm);
    padding: var(--pd-sm);
  }

  .lane-row {
    display: flex;
    align-items: stretch;
    min-height: var(--size-md);
  }

  .track-wrap {
    flex: 1;
    min-width: 0;
    width: 100%;
  }

  .track {
    position: relative;
    width: var(--timeline-track-width, 400px);
    min-height: var(--size-md);
    border-radius: var(--radius-xs);
    overflow: hidden;
    background: var(--color-gray-50);
  }

  .track-grid {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  .track-grid-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    margin-left: -0.5px;
    background: var(--color-gray-70);
  }

  .automation-hold-ghost {
    position: absolute;
    top: var(--pd-2xs);
    bottom: var(--pd-2xs);
    z-index: 1;
    pointer-events: none;
    border-radius: var(--radius-xs);
    box-sizing: border-box;
    opacity: 0.16;
    background: var(--timeline-region-color-default);
  }

  .region-block {
    position: absolute;
    top: var(--pd-2xs);
    bottom: var(--pd-2xs);
    z-index: 2;
    background: var(--timeline-region-color-default);
    border-radius: var(--radius-xs);
    box-sizing: border-box;
    cursor: default;
    user-select: none;
  }

  .automation-hold-ghost[data-category='inputs'] {
    background: var(--timeline-region-color-inputs);
  }
  .automation-hold-ghost[data-category='patterns'] {
    background: var(--timeline-region-color-patterns);
  }
  .automation-hold-ghost[data-category='shapes'] {
    background: var(--timeline-region-color-shapes);
  }
  .automation-hold-ghost[data-category='sdf'] {
    background: var(--timeline-region-color-sdf);
  }
  .automation-hold-ghost[data-category='math'] {
    background: var(--timeline-region-color-math);
  }
  .automation-hold-ghost[data-category='utilities'] {
    background: var(--timeline-region-color-utilities);
  }
  .automation-hold-ghost[data-category='distort'] {
    background: var(--timeline-region-color-distort);
  }
  .automation-hold-ghost[data-category='blend'] {
    background: var(--timeline-region-color-blend);
  }
  .automation-hold-ghost[data-category='mask'] {
    background: var(--timeline-region-color-mask);
  }
  .automation-hold-ghost[data-category='effects'] {
    background: var(--timeline-region-color-effects);
  }
  .automation-hold-ghost[data-category='output'] {
    background: var(--timeline-region-color-output);
  }
  .automation-hold-ghost[data-category='audio'] {
    background: var(--timeline-region-color-audio);
  }

  .automation-hold-ghost[data-category='inputs'][data-subgroup='system-input'] {
    background: var(--timeline-region-color-inputs-system);
  }
  .automation-hold-ghost[data-category='patterns'][data-subgroup='structured'] {
    background: var(--timeline-region-color-patterns-structured);
  }
  .automation-hold-ghost[data-category='shapes'][data-subgroup='derived'] {
    background: var(--timeline-region-color-shapes-derived);
  }
  .automation-hold-ghost[data-category='math'][data-subgroup='functions'] {
    background: var(--timeline-region-color-math-functions);
  }
  .automation-hold-ghost[data-category='math'][data-subgroup='advanced'] {
    background: var(--timeline-region-color-math-advanced);
  }
  .automation-hold-ghost[data-category='distort'][data-subgroup='warp'] {
    background: var(--timeline-region-color-distort-warp);
  }
  .automation-hold-ghost[data-category='effects'][data-subgroup='stylize'] {
    background: var(--timeline-region-color-effects-stylize);
  }

  .region-block[data-category='inputs'] {
    background: var(--timeline-region-color-inputs);
  }
  .region-block[data-category='patterns'] {
    background: var(--timeline-region-color-patterns);
  }
  .region-block[data-category='shapes'] {
    background: var(--timeline-region-color-shapes);
  }
  .region-block[data-category='sdf'] {
    background: var(--timeline-region-color-sdf);
  }
  .region-block[data-category='math'] {
    background: var(--timeline-region-color-math);
  }
  .region-block[data-category='utilities'] {
    background: var(--timeline-region-color-utilities);
  }
  .region-block[data-category='distort'] {
    background: var(--timeline-region-color-distort);
  }
  .region-block[data-category='blend'] {
    background: var(--timeline-region-color-blend);
  }
  .region-block[data-category='mask'] {
    background: var(--timeline-region-color-mask);
  }
  .region-block[data-category='effects'] {
    background: var(--timeline-region-color-effects);
  }
  .region-block[data-category='output'] {
    background: var(--timeline-region-color-output);
  }
  .region-block[data-category='audio'] {
    background: var(--timeline-region-color-audio);
  }

  .region-block[data-category='inputs'][data-subgroup='system-input'] {
    background: var(--timeline-region-color-inputs-system);
  }
  .region-block[data-category='patterns'][data-subgroup='structured'] {
    background: var(--timeline-region-color-patterns-structured);
  }
  .region-block[data-category='shapes'][data-subgroup='derived'] {
    background: var(--timeline-region-color-shapes-derived);
  }
  .region-block[data-category='math'][data-subgroup='functions'] {
    background: var(--timeline-region-color-math-functions);
  }
  .region-block[data-category='math'][data-subgroup='advanced'] {
    background: var(--timeline-region-color-math-advanced);
  }
  .region-block[data-category='distort'][data-subgroup='warp'] {
    background: var(--timeline-region-color-distort-warp);
  }
  .region-block[data-category='effects'][data-subgroup='stylize'] {
    background: var(--timeline-region-color-effects-stylize);
  }

  .region-block.is-selected {
    border: 2px solid var(--color-gray-130);
  }

  .region-resize {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 8px;
    cursor: ew-resize;
    pointer-events: auto;
  }

  .region-resize-left {
    left: 0;
  }

  .region-resize-right {
    right: 0;
  }

  .region-title {
    position: absolute;
    inset: 0 var(--pd-2xs);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 1px;
    pointer-events: none;
    overflow: hidden;
    padding: 0 2px;
  }

  .region-title-param {
    font-size: var(--text-2xs);
    font-weight: 600;
    color: rgba(255, 255, 255, 0.95);
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .region-title-node {
    font-size: var(--text-2xs);
    font-weight: 500;
    color: rgba(255, 255, 255, 0.72);
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .playhead-clip {
    position: absolute;
    top: 0;
    bottom: 0;
    left: var(--pd-xs);
    width: var(--timeline-track-width, 400px);
    overflow: hidden;
    pointer-events: none;
    z-index: 1;
  }

  .playhead-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 12px;
    margin-left: -4px;
    pointer-events: auto;
    cursor: col-resize;
    touch-action: none;
    z-index: 2;
    --timeline-playhead-bg: var(--print-highlight);
  }

  .playhead-handle:hover {
    --timeline-playhead-bg: var(--color-teal-120);
  }

  .playhead-handle:active {
    --timeline-playhead-bg: var(--primary-bg-active);
  }

  .playhead-handle.is-dragging {
    cursor: grabbing;
    user-select: none;
    --timeline-playhead-bg: var(--primary-bg-active);
  }

  .playhead-handle .playhead {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 5px;
    width: 2px;
    margin-left: -1px;
    background: var(--timeline-playhead-bg, var(--print-light));
    pointer-events: none;
  }
</style>

