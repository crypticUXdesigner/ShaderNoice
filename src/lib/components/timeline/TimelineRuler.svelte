<script lang="ts">
  import type { WaveformService } from '../../../runtime/waveform';

  interface RulerData {
    barSeconds: number;
    ticks: number[];
    hasAudio: boolean;
  }

  interface Props {
    rulerSeekEnabled: boolean;
    currentTime: number;
    duration: number;
    waveformService: WaveformService | null;
    rulerData: RulerData | null;
    timeToX: (t: number) => number;
    onMouseDown: (e: MouseEvent) => void;
    onRulerTrackEl?: (el: HTMLDivElement | null) => void;
    onWaveformCanvasEl?: (el: HTMLCanvasElement | null) => void;
  }

  let {
    rulerSeekEnabled,
    currentTime,
    duration,
    waveformService,
    rulerData,
    timeToX,
    onMouseDown,
    onRulerTrackEl,
    onWaveformCanvasEl,
  }: Props = $props();

  let rulerTrackEl: HTMLDivElement | null = $state(null);
  let rulerWaveformCanvasEl: HTMLCanvasElement | null = $state(null);

  $effect(() => {
    onRulerTrackEl?.(rulerTrackEl);
  });

  $effect(() => {
    onWaveformCanvasEl?.(rulerWaveformCanvasEl);
  });
</script>

<div class="ruler-row">
  <div
    bind:this={rulerTrackEl}
    class="ruler-track"
    class:ruler-seek-enabled={rulerSeekEnabled}
    role="slider"
    tabindex={rulerSeekEnabled ? 0 : -1}
    aria-label="Timeline position"
    aria-valuemin={0}
    aria-valuemax={duration}
    aria-valuenow={currentTime}
    title={rulerSeekEnabled ? 'Click or drag to seek' : ''}
    onmousedown={onMouseDown}
  >
    {#if waveformService}
      <div class="ruler-waveform" aria-hidden="true">
        <canvas bind:this={rulerWaveformCanvasEl}></canvas>
      </div>
    {/if}
    {#if rulerData}
      <div
        class="ruler-bars"
        class:no-audio={!rulerData.hasAudio}
        title={rulerData.hasAudio
          ? ''
          : 'No audio — bars at default BPM. Load audio for timeline duration from track.'}
        aria-hidden="true"
      >
        {#each rulerData.ticks as n (n)}
          {@const t = (n - 1) * rulerData.barSeconds}
          <div class="ruler-tick" style="left: {timeToX(t)}px">
            <span class="ruler-label">{n}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .ruler-row {
    flex-shrink: 0;
    min-height: 40px;
  }

  .ruler-track {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: var(--size-2xs);
    gap: 0;
  }

  .ruler-track.ruler-seek-enabled {
    cursor: default;
  }

  .ruler-track .ruler-waveform {
    position: relative;
    width: 100%;
    height: 20px;
    flex-shrink: 0;
    pointer-events: none;
  }

  .ruler-track .ruler-waveform canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .ruler-track .ruler-bars {
    position: relative;
    height: var(--size-xs);
    flex-shrink: 0;
  }

  .ruler-track .ruler-tick {
    position: absolute;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    transform: translateX(-50%);
  }

  .ruler-track .ruler-tick::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--print-subtle);
  }

  .ruler-track .ruler-label {
    position: relative;
    margin-left: var(--pd-xs);
    font-size: var(--text-xs);
    color: var(--print-subtle);
    font-family: var(--font-mono);
    font-weight: 700;
    padding-top: var(--pd-xs);
    white-space: nowrap;
  }
</style>

