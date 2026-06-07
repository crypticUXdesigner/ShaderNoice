<script lang="ts">
  /**
   * Knob — Rotary knob for float parameters.
   * Uses ValueInput for value display. Replaces canvas KnobParameterRenderer.
   *
   * Drag Y to rotate; value maps to min–max. Arc 135°→45°, 270° sweep; marker at value.
   * One-sided: active arc from min to value. Two-sided: active arc from knobCenter to value.
   *
   * Driver target Out: inner ring keeps full --knob-size px; outer arc overflows the fixed
   * layout box (param cells right-align controls — width must not grow or cores misalign).
   *
   * CSS tokens: --knob-marker-radius-offset (negative = inside arc), --knob-marker-size,
   * --knob-center-size (0 = hidden), --knob-center-bg (solid color or url(#gradient)),
   * --knob-center-border, --knob-center-filter (e.g. drop-shadow). Center does not rotate with value.
   */

  import type { Action } from 'svelte/action';
  import type { KnobPolarity } from '../../../../types/nodeSpec';
  import { ValueInput } from '../../ui';

  export type DriverTargetOutState = { outMin: number; outMax: number };
  export type DriverTargetOutPatch = { outMin?: number; outMax?: number };

  function readKnobToken(el: HTMLElement | null, name: string, fallback: number): number {
    if (!el) return fallback;
    const val = getComputedStyle(el).getPropertyValue(name).trim();
    if (!val) return fallback;
    const num = parseFloat(val.replace(/[^\d.-]/g, ''));
    return Number.isNaN(num) ? fallback : num;
  }

  interface Props {
    value: number;
    /** When provided, ValueInput seeds inline edit from this number instead of `value` (e.g. rare overrides). */
    valueForEdit?: number;
    min?: number;
    max?: number;
    step?: number;
    decimals?: number;
    disabled?: boolean;
    connected?: boolean;
    /** Arc fill: one-sided (min→value) or two-sided (knobCenter→value). */
    knobPolarity?: KnobPolarity;
    /** Neutral value on the arc for two-sided mode (default 0). */
    knobCenter?: number;
    /** When set, draws outer arc for driver Out min/max on parameter angular scale. */
    driverTargetOut?: DriverTargetOutState | null;
    /** Clamp/snap bounds for Out handle drag (from resolveDriverTargetOutUiBounds). */
    outBounds?: { min: number; max: number };
    /** Step/decimals for Out handles; fall back to step/decimals when omitted. */
    outStep?: number;
    outDecimals?: number;
    /** Dim outer target arc when driver bypass is active (still editable). */
    driverBypassed?: boolean;
    class?: string;
    onChange?: (value: number) => void;
    onCommit?: (value: number) => void;
    onDriverTargetOutChange?: (patch: DriverTargetOutPatch) => void;
    onDriverTargetOutCommit?: () => void;
  }

  let {
    value,
    valueForEdit,
    min = 0,
    max = 1,
    step = 0.01,
    decimals = 3,
    disabled = false,
    connected = false,
    knobPolarity = 'one-sided',
    knobCenter = 0,
    driverTargetOut = null,
    outBounds,
    outStep,
    outDecimals,
    driverBypassed = false,
    class: className = '',
    onChange,
    onCommit,
    onDriverTargetOutChange,
    onDriverTargetOutCommit
  }: Props = $props();

  /* When connected, drag/inline edit adjust the effective value shown; parent maps back to stored config via input mode. */
  const isReadOnly = $derived(disabled);

  type KnobCssLayout = {
    markerRadiusOffsetPx: number;
    markerSizePx: number;
    centerSizePx: number;
    centerBg: string;
    centerBorderWidth: number;
    centerBorderColor: string;
    knobSizePx: number;
    ringBgWidthPx: number;
    ringActiveWidthPx: number;
    driverTargetOffsetPx: number;
    driverTargetStrokePx: number;
    driverTargetHandleLengthPx: number;
    driverTargetHandleStrokePx: number;
    driverTargetHitSizePx: number;
  };

  function readKnobLayout(el: HTMLElement): KnobCssLayout {
    return {
      markerRadiusOffsetPx: readKnobToken(el, '--knob-marker-radius-offset', 0),
      markerSizePx: readKnobToken(el, '--knob-marker-size', 9),
      centerSizePx: readKnobToken(el, '--knob-center-size', 0),
      knobSizePx: readKnobToken(el, '--knob-size', 90),
      ringBgWidthPx: readKnobToken(el, '--knob-ring-bg-width', 9),
      ringActiveWidthPx: readKnobToken(el, '--knob-ring-active-width', 3),
      driverTargetOffsetPx: readKnobToken(el, '--knob-driver-target-offset', 10),
      driverTargetStrokePx: readKnobToken(el, '--knob-driver-target-stroke', 3),
      driverTargetHandleLengthPx: readKnobToken(el, '--knob-driver-target-handle-length', 8),
      driverTargetHandleStrokePx: readKnobToken(el, '--knob-driver-target-handle-stroke', 3),
      driverTargetHitSizePx: readKnobToken(el, '--knob-driver-target-hit-size', 24),
      centerBg: getComputedStyle(el).getPropertyValue('--knob-center-bg').trim() || 'transparent',
      centerBorderWidth: readKnobToken(el, '--knob-center-border-width', 0),
      centerBorderColor: getComputedStyle(el).getPropertyValue('--knob-center-border-color').trim() || 'transparent',
    };
  }

  const defaultKnobLayout: KnobCssLayout = {
    markerRadiusOffsetPx: 0,
    markerSizePx: 9,
    centerSizePx: 0,
    centerBg: 'transparent',
    centerBorderWidth: 0,
    centerBorderColor: 'transparent',
    knobSizePx: 90,
    ringBgWidthPx: 9,
    ringActiveWidthPx: 3,
    driverTargetOffsetPx: 10,
    driverTargetStrokePx: 3,
    driverTargetHandleLengthPx: 8,
    driverTargetHandleStrokePx: 3,
    driverTargetHitSizePx: 24,
  };

  let knobLayout = $state<KnobCssLayout>(defaultKnobLayout);

  const knobMeasure: Action<HTMLElement> = (node) => {
    knobLayout = readKnobLayout(node);
    const ro = new ResizeObserver(() => {
      knobLayout = readKnobLayout(node);
    });
    ro.observe(node);
    return { destroy: () => ro.disconnect() };
  };

  const markerRadiusOffsetPx = $derived(knobLayout.markerRadiusOffsetPx);
  const markerSizePx = $derived(knobLayout.markerSizePx);
  const centerSizePx = $derived(knobLayout.centerSizePx);
  const centerBg = $derived(knobLayout.centerBg);
  const centerBorderWidth = $derived(knobLayout.centerBorderWidth);
  const centerBorderColor = $derived(knobLayout.centerBorderColor);
  const knobSizePx = $derived(knobLayout.knobSizePx);
  const ringBgWidthPx = $derived(knobLayout.ringBgWidthPx);
  const ringActiveWidthPx = $derived(knobLayout.ringActiveWidthPx);
  const driverTargetOffsetPx = $derived(knobLayout.driverTargetOffsetPx);
  const driverTargetStrokePx = $derived(knobLayout.driverTargetStrokePx);
  const driverTargetHandleLengthPx = $derived(knobLayout.driverTargetHandleLengthPx);
  const driverTargetHandleStrokePx = $derived(knobLayout.driverTargetHandleStrokePx);
  const driverTargetHitSizePx = $derived(knobLayout.driverTargetHitSizePx);

  const hasDriverTargetOut = $derived(driverTargetOut != null);
  const resolvedOutBounds = $derived(outBounds ?? { min, max });
  const resolvedOutStep = $derived(outStep ?? step);
  const resolvedOutDecimals = $derived(outDecimals ?? decimals);

  const ARC_SWEEP = 270;
  const TOP_START_DEG = 135;
  const BASE_DRAG_SENSITIVITY = 100;

  function snapValue(raw: number): number {
    let v = Math.max(min, Math.min(max, raw));
    if (typeof step === 'number' && step > 0) {
      v = min + Math.round((v - min) / step) * step;
      v = Math.max(min, Math.min(max, v));
    } else if (decimals === 0) {
      v = Math.round(v);
      v = Math.max(min, Math.min(max, v));
    } else if (decimals > 0) {
      const factor = Math.pow(10, decimals);
      v = Math.round(v * factor) / factor;
      v = Math.max(min, Math.min(max, v));
    }
    return v;
  }

  function snapOutValue(raw: number): number {
    const bMin = resolvedOutBounds.min;
    const bMax = resolvedOutBounds.max;
    let v = Math.max(bMin, Math.min(bMax, raw));
    const oStep = resolvedOutStep;
    const oDecimals = resolvedOutDecimals;
    if (typeof oStep === 'number' && oStep > 0) {
      v = bMin + Math.round((v - bMin) / oStep) * oStep;
      v = Math.max(bMin, Math.min(bMax, v));
    } else if (oDecimals === 0) {
      v = Math.round(v);
      v = Math.max(bMin, Math.min(bMax, v));
    } else if (oDecimals > 0) {
      const factor = Math.pow(10, oDecimals);
      v = Math.round(v * factor) / factor;
      v = Math.max(bMin, Math.min(bMax, v));
    }
    return v;
  }

  /** Map a parameter-domain value to arc t in [0, 1], clamped for drawing when Out exceeds spec. */
  function valueToArcT(v: number): number {
    if (range <= 0) return 0;
    return Math.max(0, Math.min(1, (v - min) / range));
  }

  const range = $derived(max - min);
  const normalized = $derived((range > 0 ? (value - min) / range : 0));
  const markerAngleDeg = $derived((TOP_START_DEG + normalized * ARC_SWEEP) % 360);
  const markerAngleRad = $derived((markerAngleDeg * Math.PI) / 180);

  /* Inner viewBox matches the no-driver case so the core ring stays full --knob-size px.
     Outer target arc + handles paint outside the fixed layout box (overflow: visible). */
  const innerRingMaxStrokePx = $derived(Math.max(ringBgWidthPx, ringActiveWidthPx));
  const innerViewHalfExtentPx = $derived(knobSizePx / 2 + innerRingMaxStrokePx / 2);
  const viewSize = $derived(innerViewHalfExtentPx * 2);
  const center = $derived(viewSize / 2);
  const radius = $derived(Math.max(0, knobSizePx / 2 - ringBgWidthPx / 2));
  const outerRadius = $derived(radius + driverTargetOffsetPx);
  const markerRadius = $derived(radius + markerRadiusOffsetPx);
  const markerX = $derived(markerRadius * Math.cos(markerAngleRad));
  const markerY = $derived(markerRadius * Math.sin(markerAngleRad));
  const markerR = $derived(markerSizePx / 2);
  const centerR = $derived(centerSizePx > 0 ? centerSizePx / 2 : 0);
  const startRad = (TOP_START_DEG * Math.PI) / 180;
  const startX = $derived(radius * Math.cos(startRad));
  const startY = $derived(radius * Math.sin(startRad));
  const end45Rad = Math.PI / 4;
  const endX45 = $derived(radius * Math.cos(end45Rad));
  const endY45 = $derived(radius * Math.sin(end45Rad));

  /** Arc along the knob track from parameter t0 to t1 in [0,1] (min→max). Clockwise sweep flag 1. */
  function arcPathBetweenT(t0: number, t1: number, r: number): string | null {
    if (t1 <= t0) return null;
    const sweepAngle = (t1 - t0) * ARC_SWEEP;
    const largeArc = sweepAngle > 180 ? 1 : 0;
    const angleStartDeg = TOP_START_DEG + t0 * ARC_SWEEP;
    const angleEndDeg = TOP_START_DEG + t1 * ARC_SWEEP;
    const sr = (angleStartDeg * Math.PI) / 180;
    const er = (angleEndDeg * Math.PI) / 180;
    const x0 = r * Math.cos(sr);
    const y0 = r * Math.sin(sr);
    const x1 = r * Math.cos(er);
    const y1 = r * Math.sin(er);
    return `M ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1}`;
  }

  const valueArcPath = $derived.by(() => {
    if (range <= 0) return null;
    if (knobPolarity === 'two-sided') {
      const c = Math.max(min, Math.min(max, knobCenter));
      const tCenter = (c - min) / range;
      const tValue = normalized;
      const tLo = Math.min(tCenter, tValue);
      const tHi = Math.max(tCenter, tValue);
      return arcPathBetweenT(tLo, tHi, radius);
    }
    if (normalized <= 0) return null;
    return arcPathBetweenT(0, normalized, radius);
  });

  const driverTargetArcPath = $derived.by(() => {
    if (!driverTargetOut || range <= 0) return null;
    const tMin = valueToArcT(driverTargetOut.outMin);
    const tMax = valueToArcT(driverTargetOut.outMax);
    if (Math.abs(tMin - tMax) < 1e-9) return null;
    const tLo = Math.min(tMin, tMax);
    const tHi = Math.max(tMin, tMax);
    return arcPathBetweenT(tLo, tHi, outerRadius);
  });

  function handlePositionForValue(v: number): { x: number; y: number } {
    const t = valueToArcT(v);
    const angleDeg = (TOP_START_DEG + t * ARC_SWEEP) % 360;
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      x: outerRadius * Math.cos(angleRad),
      y: outerRadius * Math.sin(angleRad),
    };
  }

  /** Radial tick at arc endpoint, pointing outward (90° to arc tangent). */
  function handleTickForValue(v: number): { x1: number; y1: number; x2: number; y2: number } {
    const t = valueToArcT(v);
    const angleDeg = (TOP_START_DEG + t * ARC_SWEEP) % 360;
    const angleRad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const len = driverTargetHandleLengthPx;
    return {
      x1: outerRadius * cos,
      y1: outerRadius * sin,
      x2: (outerRadius + len) * cos,
      y2: (outerRadius + len) * sin,
    };
  }

  const driverOutMinHandle = $derived.by(() =>
    driverTargetOut ? handlePositionForValue(driverTargetOut.outMin) : null
  );
  const driverOutMaxHandle = $derived.by(() =>
    driverTargetOut ? handlePositionForValue(driverTargetOut.outMax) : null
  );
  const driverOutMinTick = $derived.by(() =>
    driverTargetOut ? handleTickForValue(driverTargetOut.outMin) : null
  );
  const driverOutMaxTick = $derived.by(() =>
    driverTargetOut ? handleTickForValue(driverTargetOut.outMax) : null
  );
  const driverOutHandlesCoincident = $derived.by(() => {
    if (!driverTargetOut) return false;
    return Math.abs(driverTargetOut.outMin - driverTargetOut.outMax) < 1e-9;
  });
  const driverTargetOutInverted = $derived.by(() => {
    if (!driverTargetOut) return false;
    return driverTargetOut.outMin > driverTargetOut.outMax;
  });

  const driverTargetHandleHitR = $derived(driverTargetHitSizePx / 2);

  function handleOutHandlePointerDown(e: PointerEvent, which: 'min' | 'max') {
    if (isReadOnly || !driverTargetOut) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    el.setPointerCapture(pointerId);
    let currentY = e.clientY;
    const startValue = which === 'min' ? driverTargetOut.outMin : driverTargetOut.outMax;
    let dragAccumulator = startValue;
    const bMin = resolvedOutBounds.min;
    const bMax = resolvedOutBounds.max;
    const moveRange = bMax - bMin;

    function emitPatch(next: number) {
      onDriverTargetOutChange?.(which === 'min' ? { outMin: next } : { outMax: next });
    }

    function handlePointerMove(moveEvent: PointerEvent) {
      const dy = currentY - moveEvent.clientY;
      currentY = moveEvent.clientY;
      const modifier = moveEvent.shiftKey ? 'fine' : (moveEvent.ctrlKey || moveEvent.metaKey ? 'coarse' : 'normal');
      const multipliers = { normal: 1, fine: 0.1, coarse: 10 };
      const sensitivity = BASE_DRAG_SENSITIVITY / multipliers[modifier];
      const valueDelta = moveRange > 0 ? (dy / sensitivity) * moveRange : 0;
      dragAccumulator += valueDelta;
      dragAccumulator = Math.max(bMin, Math.min(bMax, dragAccumulator));
      emitPatch(snapOutValue(dragAccumulator));
    }

    let cleanedUp = false;
    function cleanup() {
      if (cleanedUp) return;
      cleanedUp = true;
      try { el.releasePointerCapture(pointerId); } catch { /* already released */ }
      el.removeEventListener('pointermove', handlePointerMove as EventListener);
      window.removeEventListener('pointerup', handlePointerUp as EventListener);
      window.removeEventListener('pointercancel', handlePointerUp as EventListener);
      el.removeEventListener('lostpointercapture', handleLostCapture as EventListener);
      onDriverTargetOutCommit?.();
    }

    function handlePointerUp(upEvent: PointerEvent) {
      if (upEvent.pointerId !== pointerId) return;
      cleanup();
    }

    function handleLostCapture(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return;
      cleanup();
    }

    el.addEventListener('pointermove', handlePointerMove as EventListener);
    window.addEventListener('pointerup', handlePointerUp as EventListener);
    window.addEventListener('pointercancel', handlePointerUp as EventListener);
    el.addEventListener('lostpointercapture', handleLostCapture as EventListener);
  }

  function handlePointerDown(e: PointerEvent) {
    if (isReadOnly) return;
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    el.setPointerCapture(pointerId);
    let currentY = e.clientY;
    /** Unsnapped float; small dy values accumulate across pointer moves until step snaps. */
    let dragAccumulator = value;
    let lastEmittedSnapped = value;

    function handlePointerMove(moveEvent: PointerEvent) {
      const dy = currentY - moveEvent.clientY;
      currentY = moveEvent.clientY;
      const moveRange = max - min;
      const modifier = moveEvent.shiftKey ? 'fine' : (moveEvent.ctrlKey || moveEvent.metaKey ? 'coarse' : 'normal');
      const multipliers = { normal: 1, fine: 0.1, coarse: 10 };
      const sensitivity = BASE_DRAG_SENSITIVITY / multipliers[modifier];
      const valueDelta = (dy / sensitivity) * moveRange;
      dragAccumulator += valueDelta;
      dragAccumulator = Math.max(min, Math.min(max, dragAccumulator));
      const newValue = snapValue(dragAccumulator);
      lastEmittedSnapped = newValue;
      onChange?.(newValue);
    }

    let cleanedUp = false;
    function cleanup() {
      if (cleanedUp) return;
      cleanedUp = true;
      try { el.releasePointerCapture(pointerId); } catch { /* already released */ }
      el.removeEventListener('pointermove', handlePointerMove as EventListener);
      window.removeEventListener('pointerup', handlePointerUp as EventListener);
      window.removeEventListener('pointercancel', handlePointerUp as EventListener);
      el.removeEventListener('lostpointercapture', handleLostCapture as EventListener);
      onCommit?.(lastEmittedSnapped);
    }

    function handlePointerUp(upEvent: PointerEvent) {
      if (upEvent.pointerId !== pointerId) return;
      cleanup();
    }

    function handleLostCapture(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return;
      cleanup();
    }

    el.addEventListener('pointermove', handlePointerMove as EventListener);
    window.addEventListener('pointerup', handlePointerUp as EventListener);
    window.addEventListener('pointercancel', handlePointerUp as EventListener);
    el.addEventListener('lostpointercapture', handleLostCapture as EventListener);
  }
</script>

<div
  use:knobMeasure
  class="knob {className}"
  class:read-only={isReadOnly}
  class:connected={connected}
  class:has-driver-target-out={hasDriverTargetOut}
  class:driver-bypassed={driverBypassed && hasDriverTargetOut}
>
  <div class="ring">
    <div
      class="ring-core"
      role="slider"
      tabindex={isReadOnly ? -1 : 0}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-disabled={isReadOnly}
      aria-label="Knob. Drag to adjust value."
      onpointerdown={handlePointerDown}
    >
    <svg class="svg" viewBox="0 0 {viewSize} {viewSize}" overflow="visible">
      <g transform="translate({center}, {center})" aria-hidden="true">
        <!-- Optional center circle (behind arc). Border drawn inside so stroke doesn't expand the circle. -->
        {#if centerR > 0}
          <circle
            class="center center-fill"
            cx="0"
            cy="0"
            r={centerR}
            fill={centerBg}
          />
          {#if centerBorderWidth > 0}
            <circle
              class="center center-border"
              cx="0"
              cy="0"
              r={centerR - centerBorderWidth / 2}
              fill="none"
              stroke={centerBorderColor}
              stroke-width={centerBorderWidth}
            />
          {/if}
        {/if}
        <!-- Background arc (135° to 45°, 270° sweep clockwise) -->
        <path
          class="arc-bg"
          d="M {startX} {startY} A {radius} {radius} 0 1 1 {endX45} {endY45}"
          fill="none"
        />
        <!-- Value highlight arc -->
        {#if valueArcPath}
          <path
            class="arc-active"
            class:animated={connected}
            d={valueArcPath}
            fill="none"
          />
        {/if}
        <!-- Marker dot at value position -->
        <circle
          class="marker"
          cx={markerX}
          cy={markerY}
          r={markerR}
        />
      </g>
      {#if hasDriverTargetOut && driverTargetOut}
        <g class="driver-target-layer" transform="translate({center}, {center})">
          {#if driverTargetArcPath}
            <path
              class="driver-target-arc"
              class:is-inverted={driverTargetOutInverted}
              d={driverTargetArcPath}
              fill="none"
            />
          {/if}
          {#if driverOutMinHandle && driverOutMinTick}
            <g class="driver-target-handle-group">
              <circle
                class="driver-target-handle-hit"
                cx={driverOutMinHandle.x}
                cy={driverOutMinHandle.y}
                r={driverTargetHandleHitR}
                role="slider"
                tabindex={isReadOnly ? -1 : 0}
                aria-valuemin={resolvedOutBounds.min}
                aria-valuemax={resolvedOutBounds.max}
                aria-valuenow={driverTargetOut.outMin}
                aria-disabled={isReadOnly}
                aria-label="Driver target Out minimum. Drag to adjust."
                onpointerdown={(e) => handleOutHandlePointerDown(e, 'min')}
              />
              <line
                class="driver-target-handle"
                class:is-inverted={driverTargetOutInverted}
                x1={driverOutMinTick.x1}
                y1={driverOutMinTick.y1}
                x2={driverOutMinTick.x2}
                y2={driverOutMinTick.y2}
                aria-hidden="true"
              />
            </g>
          {/if}
          {#if driverOutMaxHandle && driverOutMaxTick && !driverOutHandlesCoincident}
            <g class="driver-target-handle-group">
              <circle
                class="driver-target-handle-hit"
                cx={driverOutMaxHandle.x}
                cy={driverOutMaxHandle.y}
                r={driverTargetHandleHitR}
                role="slider"
                tabindex={isReadOnly ? -1 : 0}
                aria-valuemin={resolvedOutBounds.min}
                aria-valuemax={resolvedOutBounds.max}
                aria-valuenow={driverTargetOut.outMax}
                aria-disabled={isReadOnly}
                aria-label="Driver target Out maximum. Drag to adjust."
                onpointerdown={(e) => handleOutHandlePointerDown(e, 'max')}
              />
              <line
                class="driver-target-handle"
                class:is-inverted={driverTargetOutInverted}
                x1={driverOutMaxTick.x1}
                y1={driverOutMaxTick.y1}
                x2={driverOutMaxTick.x2}
                y2={driverOutMaxTick.y2}
                aria-hidden="true"
              />
            </g>
          {/if}
        </g>
      {/if}
    </svg>
    </div>
  </div>
  <div class="value-row">
    <ValueInput
      value={value}
      valueForEdit={valueForEdit}
      {min}
      {max}
      {step}
      {decimals}
      disabled={isReadOnly}
      onChange={onChange}
      onCommit={onCommit}
      class="knob-value-input"
    />
  </div>
</div>

<style>
  .knob {
    /* Fixed layout width — param-cell controls are right-aligned; growing this box shifts cores left. */
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    width: var(--knob-size);
    flex-shrink: 0;
    overflow: visible;

    &.read-only .ring-core {
      cursor: default;
      opacity: var(--knob-readonly-ring-opacity);
    }

    .ring {
      position: relative;
      width: var(--knob-size);
      height: var(--knob-size);
      flex-shrink: 0;
      overflow: visible;
    }

    .ring-core {
      width: var(--knob-size);
      height: var(--knob-size);
      flex-shrink: 0;
      cursor: ns-resize;
      touch-action: none;
      user-select: none;
      overflow: visible;
    }

    .ring-core:focus {
      outline: none;
    }

    .ring-core:focus-visible {
      outline: 2px solid var(--color-blue-90);
      outline-offset: 2px;
    }

    .ring-core .svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .ring-core .arc-bg {
      stroke: var(--knob-ring-color);
      stroke-width: var(--knob-ring-bg-width);
      stroke-linecap: round;
    }

    .ring-core .arc-active {
      stroke: var(--knob-ring-active-color-static);
      stroke-width: var(--knob-ring-active-width);
      stroke-linecap: round;
    }

    .ring-core .arc-active.animated {
      stroke: var(--knob-ring-active-color-animated);
    }

    .ring-core .marker {
      fill: var(--knob-marker-color);
    }

    .ring-core .center-fill {
      filter: var(--knob-center-filter, none);
    }

    .ring-core .driver-target-arc {
      stroke: var(--knob-driver-target-color);
      stroke-width: var(--knob-driver-target-stroke);
      stroke-linecap: round;

      &.is-inverted {
        stroke: var(--knob-driver-target-color-inverted);
      }
    }

    .ring-core .driver-target-handle {
      stroke: var(--knob-driver-target-color);
      stroke-width: var(--knob-driver-target-handle-stroke);
      stroke-linecap: round;
      pointer-events: none;

      &.is-inverted {
        stroke: var(--knob-driver-target-color-inverted);
      }
    }

    .ring-core .driver-target-handle-hit {
      fill: transparent;
      cursor: ns-resize;
      touch-action: none;
    }

    .ring-core .driver-target-handle-hit:focus {
      outline: none;
    }

    .ring-core .driver-target-handle-hit:focus-visible + .driver-target-handle,
    .ring-core .driver-target-handle-group:focus-within .driver-target-handle {
      filter: drop-shadow(0 0 2px var(--color-blue-90));
    }

    &.driver-bypassed .driver-target-layer {
      opacity: var(--opacity-disabled);
    }

    /* Per-category: .node.{slug} sets --knob-ring-color, --knob-ring-active-color-static,
       --knob-marker-color, --knob-value-bg, --knob-value-color on itself; knob inherits. */

    .value-row {
      display: flex;
      justify-content: center;

      /* ValueInput receives class="knob-value-input"; use :global to target child component */
      :global(.knob-value-input) {
        --value-display-min-width: 60px;
        --param-control-bg: var(--knob-value-bg);
        --param-control-value-color: var(--knob-value-color);
      }
    }
  }
</style>
