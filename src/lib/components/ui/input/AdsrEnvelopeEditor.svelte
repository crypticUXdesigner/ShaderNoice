<script lang="ts">
  /**
   * Wide ADSR envelope editor — visual shape + draggable handles + compact numeric controls.
   * Layout mirrors RemapRangeEditor: graph strip is wider than tall.
   */
  import type { Snippet } from 'svelte';
  import { Button, ButtonGroup } from '../button';
  import EnvelopeCurveIcon from '../icon/EnvelopeCurveIcon.svelte';
  import ValueInput from './ValueInput.svelte';
  import type { MidiEnvelopeAdsr } from '../../../../data-model/midiEnvelopeTypes';
  import {
    applyEnvelopeCurve,
    type EnvelopeCurve,
  } from '../../../../utils/envelopeEasing';

  interface Props {
    adsr: MidiEnvelopeAdsr;
    disabled?: boolean;
    /** Normalized live level 0–1 for amplitude indicator. */
    liveLevel?: number | null;
    outMin?: number;
    outMax?: number;
    velocityToPeak?: boolean;
    class?: string;
    onChange?: (adsr: MidiEnvelopeAdsr) => void;
    onCommit?: (adsr: MidiEnvelopeAdsr) => void;
    onOutMinChange?: (value: number) => void;
    onOutMaxChange?: (value: number) => void;
    onVelocityToPeakChange?: (velocityToPeak: boolean) => void;
    /** Full-width row below ADSR numeric controls (e.g. MIDI overlap mode). */
    controlsTrail?: Snippet;
  }

  type HandleId = 'attack' | 'decaySustain' | 'release';
  type PhaseCurveField = 'attackCurve' | 'decayCurve' | 'releaseCurve';

  const PATH_SAMPLES_PER_SEGMENT = 32;

  const CURVE_OPTIONS: Array<{ value: EnvelopeCurve; label: string }> = [
    { value: 'linear', label: 'Linear' },
    { value: 'exponential', label: 'Exponential' },
    { value: 'logarithmic', label: 'Logarithmic' },
    { value: 'smooth', label: 'Smooth' },
  ];

  const MIN_ENVELOPE_MS = 1;
  const MAX_ATTACK_DECAY_MS = 4000;
  const MAX_RELEASE_MS = 8000;

  function envelopeMsFromSeconds(seconds: number): number {
    return Math.round(seconds * 1000);
  }

  function envelopeSecondsFromMs(ms: number): number {
    return Math.max(MIN_SEGMENT_SECONDS, ms / 1000);
  }

  function formatEnvelopeTimeAria(seconds: number): string {
    return `${envelopeMsFromSeconds(seconds)} milliseconds`;
  }

  function patchAttackMs(ms: number, commit = false) {
    patch({ attackSeconds: envelopeSecondsFromMs(ms) }, commit);
  }

  function patchDecayMs(ms: number, commit = false) {
    patch({ decaySeconds: envelopeSecondsFromMs(ms) }, commit);
  }

  function patchReleaseMs(ms: number, commit = false) {
    patch({ releaseSeconds: envelopeSecondsFromMs(ms) }, commit);
  }

  function sampleSegment(
    xStart: number,
    xEnd: number,
    levelStart: number,
    levelEnd: number,
    curve: EnvelopeCurve,
    includeStart: boolean
  ): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];
    const startIndex = includeStart ? 0 : 1;
    for (let i = startIndex; i <= PATH_SAMPLES_PER_SEGMENT; i++) {
      const t = i / PATH_SAMPLES_PER_SEGMENT;
      const level = levelStart + (levelEnd - levelStart) * applyEnvelopeCurve(t, curve);
      points.push({
        x: xStart + (xEnd - xStart) * t,
        y: 1 - level,
      });
    }
    return points;
  }

  function buildSampledEnvelopePath(
    x1: number,
    x2: number,
    x3: number,
    sustainLevel: number,
    attackCurve: EnvelopeCurve,
    decayCurve: EnvelopeCurve,
    releaseCurve: EnvelopeCurve
  ): string {
    const ySustain = 1 - sustainLevel;
    const segments = [
      ...sampleSegment(0, x1, 0, 1, attackCurve, true),
      ...sampleSegment(x1, x2, 1, sustainLevel, decayCurve, false),
      { x: x2, y: ySustain },
      { x: x3, y: ySustain },
      ...sampleSegment(x3, 1, sustainLevel, 0, releaseCurve, false),
    ];
    const sx = (n: number) => n * 100;
    const sy = (n: number) => n * 100;
    let d = `M ${sx(segments[0].x)} ${sy(segments[0].y)}`;
    for (let i = 1; i < segments.length; i++) {
      d += ` L ${sx(segments[i].x)} ${sy(segments[i].y)}`;
    }
    return d;
  }

  let {
    adsr,
    disabled = false,
    liveLevel = null,
    outMin,
    outMax,
    velocityToPeak = true,
    class: className = '',
    onChange,
    onCommit,
    onOutMinChange,
    onOutMaxChange,
    onVelocityToPeakChange,
    controlsTrail,
  }: Props = $props();

  const showOutputControls = $derived(outMin != null && outMax != null);
  const useVelocityPeak = $derived(velocityToPeak !== false);
  const sustainHoldUsesNoteLength = $derived(adsr.sustainHoldUsesNoteLength !== false);

  const SUSTAIN_VISUAL_SECONDS = 0.18;
  const MIN_SEGMENT_SECONDS = 0.001;
  const MIN_NORM_GAP = 0.02;

  let graphEl: HTMLDivElement | undefined = $state();
  let activeHandle = $state<HandleId | null>(null);
  let dragAdsr = $state<MidiEnvelopeAdsr | null>(null);

  const displayAdsr = $derived(activeHandle != null && dragAdsr != null ? dragAdsr : adsr);

  const segmentWeights = $derived.by(() => {
    const a = Math.max(MIN_SEGMENT_SECONDS, displayAdsr.attackSeconds);
    const d = Math.max(MIN_SEGMENT_SECONDS, displayAdsr.decaySeconds);
    const s = SUSTAIN_VISUAL_SECONDS;
    const r = Math.max(MIN_SEGMENT_SECONDS, displayAdsr.releaseSeconds);
    const total = a + d + s + r;
    return { a: a / total, d: d / total, s: s / total, r: r / total, total };
  });

  const sustainNormY = $derived(
    1 - Math.max(0, Math.min(1, displayAdsr.sustainLevel))
  );

  const graphPoints = $derived.by(() => {
    const w = segmentWeights;
    const x1 = w.a;
    const x2 = x1 + w.d;
    const x3 = x2 + w.s;
    const ySustain = sustainNormY;
    return {
      attack: { x: x1, y: 0 },
      decaySustain: { x: x2, y: ySustain },
      releaseStart: { x: x3, y: ySustain },
    };
  });

  const envelopePath = $derived.by(() => {
    const { attack, decaySustain, releaseStart } = graphPoints;
    const sustainLevel = Math.max(0, Math.min(1, displayAdsr.sustainLevel));
    return buildSampledEnvelopePath(
      attack.x,
      decaySustain.x,
      releaseStart.x,
      sustainLevel,
      displayAdsr.attackCurve ?? 'linear',
      displayAdsr.decayCurve ?? 'linear',
      displayAdsr.releaseCurve ?? 'linear'
    );
  });

  const envelopeFillPath = $derived(`${envelopePath} L 100 100 L 0 100 Z`);

  const liveLevelY = $derived(
    liveLevel != null ? Math.max(0, Math.min(1, 1 - liveLevel)) * 100 : null
  );

  function clampSeconds(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  function clampNorm(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  function attackEndNormFromAttack(attackSeconds: number, source: MidiEnvelopeAdsr): number {
    const attack = Math.max(MIN_SEGMENT_SECONDS, attackSeconds);
    const decay = Math.max(MIN_SEGMENT_SECONDS, source.decaySeconds);
    const release = Math.max(MIN_SEGMENT_SECONDS, source.releaseSeconds);
    return attack / (attack + decay + SUSTAIN_VISUAL_SECONDS + release);
  }

  function decayEndNormFromDecay(decaySeconds: number, source: MidiEnvelopeAdsr): number {
    const attack = Math.max(MIN_SEGMENT_SECONDS, source.attackSeconds);
    const decay = Math.max(MIN_SEGMENT_SECONDS, decaySeconds);
    const release = Math.max(MIN_SEGMENT_SECONDS, source.releaseSeconds);
    return (attack + decay) / (attack + decay + SUSTAIN_VISUAL_SECONDS + release);
  }

  function preReleaseSeconds(source: MidiEnvelopeAdsr): number {
    return (
      Math.max(MIN_SEGMENT_SECONDS, source.attackSeconds) +
      Math.max(MIN_SEGMENT_SECONDS, source.decaySeconds) +
      SUSTAIN_VISUAL_SECONDS
    );
  }

  function releaseStartNormFromRelease(releaseSeconds: number, source: MidiEnvelopeAdsr): number {
    const head = preReleaseSeconds(source);
    const release = Math.max(MIN_SEGMENT_SECONDS, releaseSeconds);
    return head / (head + release);
  }

  function attackFromNorm(normX: number, source: MidiEnvelopeAdsr): number {
    const others =
      Math.max(MIN_SEGMENT_SECONDS, source.decaySeconds) +
      SUSTAIN_VISUAL_SECONDS +
      Math.max(MIN_SEGMENT_SECONDS, source.releaseSeconds);
    const attack = (normX * others) / Math.max(MIN_NORM_GAP, 1 - normX);
    return clampSeconds(attack, MIN_SEGMENT_SECONDS, 4);
  }

  function decayFromNorm(normX: number, source: MidiEnvelopeAdsr): number {
    const attack = Math.max(MIN_SEGMENT_SECONDS, source.attackSeconds);
    const fixedTail =
      SUSTAIN_VISUAL_SECONDS + Math.max(MIN_SEGMENT_SECONDS, source.releaseSeconds);
    const decay = (normX * (attack + fixedTail) - attack) / Math.max(MIN_NORM_GAP, 1 - normX);
    return clampSeconds(decay, MIN_SEGMENT_SECONDS, 4);
  }

  function releaseFromNorm(normX: number, source: MidiEnvelopeAdsr): number {
    const head = preReleaseSeconds(source);
    const release = head * (1 / Math.max(MIN_NORM_GAP, normX) - 1);
    return clampSeconds(release, MIN_SEGMENT_SECONDS, 8);
  }

  function sustainFromNormY(normY: number): number {
    return Math.max(0, Math.min(1, 1 - normY));
  }

  function patch(partial: Partial<MidiEnvelopeAdsr>, commit = false) {
    const next: MidiEnvelopeAdsr = { ...adsr, ...partial };
    onChange?.(next);
    if (commit) onCommit?.(next);
  }

  function setPhaseCurve(field: PhaseCurveField, curve: EnvelopeCurve, commit = true) {
    patch({ [field]: curve }, commit);
  }

  function phaseCurveValue(field: PhaseCurveField): EnvelopeCurve {
    return adsr[field] ?? 'linear';
  }

  function clientToNorm(clientX: number, clientY: number): { x: number; y: number } {
    const rect = graphEl!.getBoundingClientRect();
    const x = clampNorm((clientX - rect.left) / rect.width, 0, 1);
    const y = clampNorm((clientY - rect.top) / rect.height, 0, 1);
    return { x, y };
  }

  function adsrFromHandle(handle: HandleId, normX: number, normY: number, source: MidiEnvelopeAdsr): MidiEnvelopeAdsr {
    if (handle === 'attack') {
      const minX = attackEndNormFromAttack(MIN_SEGMENT_SECONDS, source);
      const maxX = attackEndNormFromAttack(4, source);
      return {
        ...source,
        attackSeconds: attackFromNorm(clampNorm(normX, minX, maxX), source),
      };
    }
    if (handle === 'decaySustain') {
      const minX = decayEndNormFromDecay(MIN_SEGMENT_SECONDS, source);
      const maxX = decayEndNormFromDecay(4, source);
      return {
        ...source,
        decaySeconds: decayFromNorm(clampNorm(normX, minX, maxX), source),
        sustainLevel: sustainFromNormY(normY),
      };
    }
    const head = preReleaseSeconds(source);
    const minX = head / (head + 8);
    const maxX = releaseStartNormFromRelease(MIN_SEGMENT_SECONDS, source);
    return {
      ...source,
      releaseSeconds: releaseFromNorm(clampNorm(normX, minX, maxX), source),
    };
  }

  function handlePointerDown(handle: HandleId, e: PointerEvent) {
    if (disabled || !graphEl) return;
    e.preventDefault();
    e.stopPropagation();
    activeHandle = handle;
    dragAdsr = { ...adsr };
    const pointerId = e.pointerId;
    graphEl.setPointerCapture(pointerId);

    function updateFromClient(clientX: number, clientY: number) {
      const { x, y } = clientToNorm(clientX, clientY);
      const base = dragAdsr ?? adsr;
      const next = adsrFromHandle(handle, x, y, base);
      dragAdsr = next;
      onChange?.(next);
    }

    function handlePointerMove(moveEvent: PointerEvent) {
      updateFromClient(moveEvent.clientX, moveEvent.clientY);
    }

    function handlePointerUp() {
      const committed = dragAdsr ?? adsr;
      activeHandle = null;
      dragAdsr = null;
      graphEl?.releasePointerCapture(pointerId);
      graphEl?.removeEventListener('pointermove', handlePointerMove as EventListener);
      window.removeEventListener('pointerup', handlePointerUp as EventListener);
      window.removeEventListener('pointercancel', handlePointerUp as EventListener);
      onCommit?.(committed);
    }

    graphEl.addEventListener('pointermove', handlePointerMove as EventListener);
    window.addEventListener('pointerup', handlePointerUp as EventListener);
    window.addEventListener('pointercancel', handlePointerUp as EventListener);
  }

  function stopCardSelect(e: Event) {
    e.stopPropagation();
  }
</script>

<div class="adsr-envelope-editor {className}" data-disabled={disabled || undefined}>
  <div
    class="graph-strip display-graph"
    bind:this={graphEl}
    role="group"
    aria-label="ADSR response shape"
    onpointerdown={stopCardSelect}
    onclick={stopCardSelect}
  >
    <svg class="graph-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <rect x="0" y="0" width="100" height="100" class="graph-bg" />
      <line x1="0" y1="100" x2="100" y2="100" class="graph-baseline" />
      <path d={envelopeFillPath} class="graph-fill" />
      <path d={envelopePath} class="graph-path" vector-effect="non-scaling-stroke" />
      {#if liveLevelY != null}
        <line
          x1="0"
          y1={liveLevelY}
          x2="100"
          y2={liveLevelY}
          class="live-level"
          vector-effect="non-scaling-stroke"
        />
      {/if}
    </svg>

    <button
      type="button"
      class="handle handle-attack"
      class:active={activeHandle === 'attack'}
      style:left="{graphPoints.attack.x * 100}%"
      style:top="{graphPoints.attack.y * 100}%"
      aria-label="Attack time"
      {disabled}
      onpointerdown={(e) => handlePointerDown('attack', e)}
    ></button>
    <button
      type="button"
      class="handle handle-decay-sustain"
      class:active={activeHandle === 'decaySustain'}
      style:left="{graphPoints.decaySustain.x * 100}%"
      style:top="{graphPoints.decaySustain.y * 100}%"
      aria-label="Decay time and sustain level"
      {disabled}
      onpointerdown={(e) => handlePointerDown('decaySustain', e)}
    ></button>
    <button
      type="button"
      class="handle handle-release"
      class:active={activeHandle === 'release'}
      style:left="{graphPoints.releaseStart.x * 100}%"
      style:top="{graphPoints.releaseStart.y * 100}%"
      aria-label="Release time"
      {disabled}
      onpointerdown={(e) => handlePointerDown('release', e)}
    ></button>

    <div
      class="axis-labels"
      style="grid-template-columns: {segmentWeights.a}fr {segmentWeights.d}fr {segmentWeights.s}fr {segmentWeights.r}fr"
    >
      <span>A</span>
      <span>D</span>
      <span>S</span>
      <span>R</span>
    </div>
  </div>

  <p class="graph-hint">
    {#if sustainHoldUsesNoteLength}
      Hold at sustain until the note ends.
    {:else}
      Skip sustain. Release after decay.
    {/if}
  </p>

  <div
    class="controls-grid"
    role="presentation"
    onpointerdown={stopCardSelect}
    onclick={stopCardSelect}
  >
    <div class="control">
      <ButtonGroup class="curve-type-tabs" role="tablist" ariaLabel="Attack curve">
        {#each CURVE_OPTIONS as opt (opt.value)}
          <Button
            variant="ghost"
            size="xs"
            mode="icon-only"
            role="tab"
            class={phaseCurveValue('attackCurve') === opt.value ? 'is-active' : ''}
            aria-selected={phaseCurveValue('attackCurve') === opt.value}
            title={`Attack: ${opt.label}`}
            {disabled}
            onclick={(e) => {
              e.stopPropagation();
              setPhaseCurve('attackCurve', opt.value);
            }}
          >
            <EnvelopeCurveIcon curve={opt.value} />
          </Button>
        {/each}
      </ButtonGroup>
      <ValueInput
        value={envelopeMsFromSeconds(adsr.attackSeconds)}
        min={MIN_ENVELOPE_MS}
        max={MAX_ATTACK_DECAY_MS}
        step={1}
        decimals={0}
        size="sm"
        {disabled}
        onChange={patchAttackMs}
        onCommit={(v) => patchAttackMs(v, true)}
      />
      <span class="label" title={formatEnvelopeTimeAria(adsr.attackSeconds)}>Attack ms</span>
    </div>
    <div class="control">
      <ButtonGroup class="curve-type-tabs" role="tablist" ariaLabel="Decay curve">
        {#each CURVE_OPTIONS as opt (opt.value)}
          <Button
            variant="ghost"
            size="xs"
            mode="icon-only"
            role="tab"
            class={phaseCurveValue('decayCurve') === opt.value ? 'is-active' : ''}
            aria-selected={phaseCurveValue('decayCurve') === opt.value}
            title={`Decay: ${opt.label}`}
            {disabled}
            onclick={(e) => {
              e.stopPropagation();
              setPhaseCurve('decayCurve', opt.value);
            }}
          >
            <EnvelopeCurveIcon curve={opt.value} />
          </Button>
        {/each}
      </ButtonGroup>
      <ValueInput
        value={envelopeMsFromSeconds(adsr.decaySeconds)}
        min={MIN_ENVELOPE_MS}
        max={MAX_ATTACK_DECAY_MS}
        step={1}
        decimals={0}
        size="sm"
        {disabled}
        onChange={patchDecayMs}
        onCommit={(v) => patchDecayMs(v, true)}
      />
      <span class="label" title={formatEnvelopeTimeAria(adsr.decaySeconds)}>Decay ms</span>
    </div>
    <div class="control control-no-curve">
      <ButtonGroup
        class="sustain-hold-toggle"
        role="radiogroup"
        ariaLabel="Sustain hold timing"
      >
        <Button
          variant="ghost"
          size="xs"
          class={sustainHoldUsesNoteLength ? 'is-active' : ''}
          role="radio"
          aria-checked={sustainHoldUsesNoteLength}
          title="Hold at sustain level until the note ends in the arrangement"
          {disabled}
          onclick={() => patch({ sustainHoldUsesNoteLength: true }, true)}
        >
          Note
        </Button>
        <Button
          variant="ghost"
          size="xs"
          class={!sustainHoldUsesNoteLength ? 'is-active' : ''}
          role="radio"
          aria-checked={!sustainHoldUsesNoteLength}
          title="Start release after decay; ignore remaining note length"
          {disabled}
          onclick={() => patch({ sustainHoldUsesNoteLength: false }, true)}
        >
          Decay
        </Button>
      </ButtonGroup>
      <ValueInput
        value={adsr.sustainLevel}
        min={0}
        max={1}
        step={0.01}
        decimals={2}
        size="sm"
        {disabled}
        onChange={(v) => patch({ sustainLevel: Math.max(0, Math.min(1, v)) })}
        onCommit={(v) => patch({ sustainLevel: Math.max(0, Math.min(1, v)) }, true)}
      />
      <span class="label">Sustain</span>
    </div>
    <div class="control">
      <ButtonGroup class="curve-type-tabs" role="tablist" ariaLabel="Release curve">
        {#each CURVE_OPTIONS as opt (opt.value)}
          <Button
            variant="ghost"
            size="xs"
            mode="icon-only"
            role="tab"
            class={phaseCurveValue('releaseCurve') === opt.value ? 'is-active' : ''}
            aria-selected={phaseCurveValue('releaseCurve') === opt.value}
            title={`Release: ${opt.label}`}
            {disabled}
            onclick={(e) => {
              e.stopPropagation();
              setPhaseCurve('releaseCurve', opt.value);
            }}
          >
            <EnvelopeCurveIcon curve={opt.value} />
          </Button>
        {/each}
      </ButtonGroup>
      <ValueInput
        value={envelopeMsFromSeconds(adsr.releaseSeconds)}
        min={MIN_ENVELOPE_MS}
        max={MAX_RELEASE_MS}
        step={1}
        decimals={0}
        size="sm"
        {disabled}
        onChange={patchReleaseMs}
        onCommit={(v) => patchReleaseMs(v, true)}
      />
      <span class="label" title={formatEnvelopeTimeAria(adsr.releaseSeconds)}>Release ms</span>
    </div>
    {#if showOutputControls}
      <div class="control control-velocity">
        <ButtonGroup class="velocity-mode-toggle" role="radiogroup" ariaLabel="Response intensity">
          <Button
            variant="ghost"
            size="xs"
            class={useVelocityPeak ? 'is-active' : ''}
            role="radio"
            aria-checked={useVelocityPeak}
            title="Scale response by MIDI velocity"
            {disabled}
            onclick={() => onVelocityToPeakChange?.(true)}
          >
            Velocity
          </Button>
          <Button
            variant="ghost"
            size="xs"
            class={!useVelocityPeak ? 'is-active' : ''}
            role="radio"
            aria-checked={!useVelocityPeak}
            title="Ignore velocity; every note uses full strength"
            {disabled}
            onclick={() => onVelocityToPeakChange?.(false)}
          >
            Peak
          </Button>
        </ButtonGroup>
      </div>
      <div class="control">
        <ValueInput
          value={outMin!}
          min={-9999}
          max={9999}
          step={0.01}
          decimals={3}
          size="sm"
          {disabled}
          onChange={(v) => onOutMinChange?.(v)}
          onCommit={(v) => onOutMinChange?.(v)}
        />
        <span class="label">Out min</span>
      </div>
      <div class="control">
        <ValueInput
          value={outMax!}
          min={-9999}
          max={9999}
          step={0.01}
          decimals={3}
          size="sm"
          {disabled}
          onChange={(v) => onOutMaxChange?.(v)}
          onCommit={(v) => onOutMaxChange?.(v)}
        />
        <span class="label">Out max</span>
      </div>
    {/if}
  </div>

  {#if controlsTrail}
    <div class="controls-trail" role="presentation" onpointerdown={stopCardSelect} onclick={stopCardSelect}>
      {@render controlsTrail()}
    </div>
  {/if}
</div>

<style>
  .adsr-envelope-editor {
    display: flex;
    flex-direction: column;
    gap: var(--pd-sm);
    width: 100%;
  }

  .graph-strip {
    position: relative;
    width: 100%;
    aspect-ratio: 4.5 / 1;
    min-height: 44px;
    max-height: 72px;
    touch-action: none;
  }

  .graph-svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  .graph-bg {
    fill: var(--color-gray-40);
  }

  .graph-baseline {
    stroke: var(--color-gray-80);
    stroke-width: 0.75px;
    vector-effect: non-scaling-stroke;
    opacity: 0.5;
  }

  .graph-fill {
    fill: var(--color-violet-70);
    fill-opacity: 0.22;
  }

  .graph-path {
    fill: none;
    stroke: var(--color-violet-110);
    stroke-width: 2px;
    stroke-linejoin: round;
    stroke-linecap: round;
  }

  .live-level {
    stroke: var(--color-violet-130);
    stroke-width: 1.5px;
    stroke-opacity: 0.85;
    stroke-dasharray: 4 3;
    opacity: 0.9;
  }

  .handle {
    position: absolute;
    width: var(--size-sm);
    height: var(--size-sm);
    margin: 0;
    padding: 0;
    border: 2px solid var(--color-gray-120);
    border-radius: 50%;
    background: var(--color-violet-100);
    transform: translate(-50%, -50%);
    touch-action: none;

    &:hover {
      background: var(--color-violet-120);
      border-color: var(--color-gray-130);
    }

    &.active {
      background: var(--color-violet-130);
      border-color: var(--color-violet-150);
      box-shadow: 0 0 0 2px var(--color-violet-90);
    }

    &:focus-visible {
      outline: 2px solid var(--color-violet-120);
      outline-offset: 2px;
    }

    &:disabled {
      opacity: var(--opacity-disabled);
      pointer-events: none;
    }
  }

  .handle-decay-sustain {
    /* Slightly larger — primary 2-axis control */
    width: calc(var(--size-sm) + 2px);
    height: calc(var(--size-sm) + 2px);
  }

  .graph-hint {
    margin: 0;
    font-size: var(--text-2xs);
    color: var(--color-gray-100);
    line-height: 1.35;
  }

  .axis-labels {
    position: absolute;
    inset: auto 0 0 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    pointer-events: none;
    padding: 0 var(--pd-2xs) var(--pd-2xs);
    font-size: var(--text-2xs);
    color: var(--color-gray-100);
    text-align: center;
  }

  .controls-trail {
    width: 100%;
  }

  .controls-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    column-gap: var(--pd-sm);
    row-gap: var(--pd-md);
  }

  .control {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--pd-2xs);
    min-width: 0;

    :global(.curve-type-tabs) {
      width: 100%;
      justify-content: stretch;
      padding: var(--pd-2xs);
      gap: var(--pd-2xs);
      border-radius: var(--radius-sm);
      background: var(--color-gray-50);
      border: 1px solid var(--color-gray-70);
      box-sizing: border-box;

      :global(.button.xs.icon-only) {
        flex: 1 1 0;
        min-width: 0;
      }
    }

    :global(.value-input-wrapper) {
      width: 100%;
    }

    :global(.value-input) {
      width: 100%;
      box-sizing: border-box;
      justify-content: center;
    }

    .label {
      font-size: var(--text-xs);
      color: var(--color-gray-110);
      text-align: center;
    }
  }

  .control-velocity {
    grid-column: span 2;
    align-items: flex-start;

    :global(.velocity-mode-toggle) {
      flex-shrink: 0;
      padding: var(--pd-2xs);
      gap: var(--pd-2xs);
    }
  }

  .control-no-curve :global(.sustain-hold-toggle) {
    width: fit-content;
    max-width: 100%;
    align-self: center;
    flex-shrink: 0;
    padding: var(--pd-2xs);
    gap: var(--pd-2xs);

    :global(.button.xs) {
      flex: 0 0 auto;
    }
  }

  .control-no-curve .curve-type-tabs-spacer {
    width: 100%;
    min-height: calc(var(--size-xs) + var(--pd-2xs) * 2 + 2px);
    box-sizing: border-box;
  }

  .adsr-envelope-editor[data-disabled] {
    opacity: var(--opacity-disabled);
    pointer-events: none;
  }
</style>
