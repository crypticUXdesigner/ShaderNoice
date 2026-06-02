import type { AutomationCurve } from '../../../data-model/types';
import { evaluateCurveAtNormalizedTime } from '../../../utils/automationEvaluator';
import {
  CURVE_EDITOR_DEFAULT_TIME_VIEWPORT,
  GRAPH_PADDING,
  curveTimeToX,
  curveValueToY,
  type CurveEditorPadding,
  type CurveEditorTimeViewport,
} from './curveEditorGeometry';

export const CURVE_EDITOR_SAMPLES = 240;

export const CURVE_EDITOR_WAVEFORM_BAND_FRACTION = 0.4;

/** Snap SVG coords to half-pixels so 2px strokes stay crisp when scaled. */
export function snapCurveEditorSvgCoord(n: number): number {
  return Math.round(n * 2) / 2;
}

export function buildCurveEditorCurvePathD(
  curve: AutomationCurve,
  graphWidth: number,
  graphHeight: number,
  samples: number = CURVE_EDITOR_SAMPLES,
  pad: CurveEditorPadding = GRAPH_PADDING,
  viewport: CurveEditorTimeViewport = CURVE_EDITOR_DEFAULT_TIME_VIEWPORT
): string {
  const pathD: string[] = [];
  const t0 = viewport.start;
  const t1 = Math.min(1, viewport.start + viewport.span);
  for (let i = 0; i <= samples; i++) {
    const t = t0 + (i / samples) * (t1 - t0);
    const v = evaluateCurveAtNormalizedTime(curve, t);
    const x = snapCurveEditorSvgCoord(curveTimeToX(t, graphWidth, pad, viewport));
    const y = snapCurveEditorSvgCoord(curveValueToY(v, graphHeight, pad));
    pathD.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
  }
  return pathD.join(' ');
}

export function buildCurveEditorWaveformPathD(
  left: number[],
  right: number[],
  graphWidth: number,
  graphHeight: number,
  pad: CurveEditorPadding = GRAPH_PADDING,
  viewport: CurveEditorTimeViewport = CURVE_EDITOR_DEFAULT_TIME_VIEWPORT
): string {
  if (left.length < 2) return '';
  const n = left.length;
  const innerH = graphHeight - pad.top - pad.bottom;
  const bandHalf = (innerH * CURVE_EDITOR_WAVEFORM_BAND_FRACTION) / 2;
  const centerY = curveValueToY(0.5, graphHeight, pad);
  const maxL = Math.max(...left);
  const maxR = Math.max(...right);
  const scaleL = maxL > 0 ? 1 / maxL : 0;
  const scaleR = maxR > 0 ? 1 / maxR : 0;
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = curveTimeToX(t, graphWidth, pad, viewport);
    const vL = (left[i] ?? 0) * scaleL;
    const topY = centerY - vL * bandHalf;
    parts.push(`${i === 0 ? 'M' : 'L'} ${x} ${topY}`);
  }
  for (let i = n - 1; i >= 0; i--) {
    const t = i / (n - 1);
    const x = curveTimeToX(t, graphWidth, pad, viewport);
    const vR = (right[i] ?? 0) * scaleR;
    const bottomY = centerY + vR * bandHalf;
    parts.push(`L ${x} ${bottomY}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

export function buildCurveEditorGridLines(
  graphWidth: number,
  graphHeight: number,
  regionBars: number,
  division: number,
  pad: CurveEditorPadding = GRAPH_PADDING,
  viewport: CurveEditorTimeViewport = CURVE_EDITOR_DEFAULT_TIME_VIEWPORT
): { vertical: Array<{ x: number; class: string }>; horizontal: Array<{ y: number }> } {
  const innerW = graphWidth - pad.left - pad.right;
  const innerH = graphHeight - pad.top - pad.bottom;
  if (innerW <= 0 || innerH <= 0) return { vertical: [], horizontal: [] };

  const viewEnd = Math.min(1, viewport.start + viewport.span);
  const minorStep = 1 / (regionBars * division);
  const vertical: Array<{ x: number; class: string }> = [];
  const tStart = Math.max(0, Math.floor(viewport.start / minorStep) * minorStep);
  for (let t = tStart; t <= viewEnd + 1e-6; t += minorStep) {
    if (t < viewport.start - 1e-6 || t > viewEnd + 1e-6) continue;
    const x = curveTimeToX(t, graphWidth, pad, viewport);
    const barFrac = t * regionBars;
    const inBar = barFrac - Math.floor(barFrac);
    const isBar = Math.abs(barFrac - Math.round(barFrac)) < 1e-6 || t >= 1 - 1e-6;
    const isSixteenthOnly =
      division >= 16 &&
      !isBar &&
      Math.abs(inBar * 8 - Math.round(inBar * 8)) > 1e-6 &&
      Math.abs(inBar * 16 - Math.round(inBar * 16)) < 1e-6;
    let lineClass = 'grid-line';
    if (isBar) lineClass += ' grid-line-major';
    else if (isSixteenthOnly) lineClass += ' grid-line-sub';
    else lineClass += ' grid-line-minor';
    vertical.push({ x, class: lineClass });
  }
  const horizontal: Array<{ y: number }> = [];
  for (let i = 1; i <= 3; i++) {
    horizontal.push({ y: curveValueToY(i / 4, graphHeight, pad) });
  }
  return { vertical, horizontal };
}
