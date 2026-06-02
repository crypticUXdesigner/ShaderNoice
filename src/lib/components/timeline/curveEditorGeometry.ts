/** SVG graph layout: normalized time horizontal, value vertical. */

export const GRAPH_PADDING = { top: 8, right: 8, bottom: 24, left: 36 } as const;

export type CurveEditorPadding = typeof GRAPH_PADDING;

/** Visible normalized-time window (horizontal zoom / pan). */
export type CurveEditorTimeViewport = {
  start: number;
  span: number;
};

export const CURVE_EDITOR_VIEW_SPAN_MIN = 0.02;
export const CURVE_EDITOR_VIEW_SPAN_MAX = 1;

export const CURVE_EDITOR_DEFAULT_TIME_VIEWPORT: CurveEditorTimeViewport = {
  start: 0,
  span: CURVE_EDITOR_VIEW_SPAN_MAX,
};

export function clampCurveEditorViewTimeSpan(span: number): number {
  return Math.max(CURVE_EDITOR_VIEW_SPAN_MIN, Math.min(CURVE_EDITOR_VIEW_SPAN_MAX, span));
}

export function clampCurveEditorViewTimeStart(start: number, span: number): number {
  const s = clampCurveEditorViewTimeSpan(span);
  return Math.max(0, Math.min(1 - s, start));
}

export function normalizeCurveEditorTimeViewport(
  viewport: CurveEditorTimeViewport
): CurveEditorTimeViewport {
  const span = clampCurveEditorViewTimeSpan(viewport.span);
  return { start: clampCurveEditorViewTimeStart(viewport.start, span), span };
}

/** Zoom around `anchorTime` (normalized 0–1). Positive `delta` zooms in. */
export function applyCurveEditorTimeZoom(
  viewport: CurveEditorTimeViewport,
  delta: number,
  anchorTime: number
): CurveEditorTimeViewport {
  if (delta === 0) return normalizeCurveEditorTimeViewport(viewport);
  const zoomFactor = 1 + delta;
  let span = viewport.span / zoomFactor;
  span = clampCurveEditorViewTimeSpan(span);
  const anchorFrac =
    viewport.span > 0 ? (anchorTime - viewport.start) / viewport.span : 0.5;
  const start = clampCurveEditorViewTimeStart(anchorTime - anchorFrac * span, span);
  return { start, span };
}

export function curveTimeToX(
  t: number,
  graphWidth: number,
  pad: CurveEditorPadding = GRAPH_PADDING,
  viewport: CurveEditorTimeViewport = CURVE_EDITOR_DEFAULT_TIME_VIEWPORT
): number {
  const innerW = graphWidth - pad.left - pad.right;
  const u = viewport.span > 0 ? (t - viewport.start) / viewport.span : t;
  return pad.left + u * innerW;
}

export function curveValueToY(
  v: number,
  graphHeight: number,
  pad: CurveEditorPadding = GRAPH_PADDING
): number {
  return pad.top + (1 - v) * (graphHeight - pad.top - pad.bottom);
}

export function curveXToTime(
  x: number,
  graphWidth: number,
  pad: CurveEditorPadding = GRAPH_PADDING,
  viewport: CurveEditorTimeViewport = CURVE_EDITOR_DEFAULT_TIME_VIEWPORT
): number {
  const w = graphWidth - pad.left - pad.right;
  if (w <= 0) return viewport.start;
  const u = (x - pad.left) / w;
  const t = viewport.start + u * viewport.span;
  return Math.max(0, Math.min(1, t));
}

export function curveYToValue(
  y: number,
  graphHeight: number,
  pad: CurveEditorPadding = GRAPH_PADDING
): number {
  const h = graphHeight - pad.top - pad.bottom;
  if (h <= 0) return 0;
  const v = 1 - (y - pad.top) / h;
  return Math.max(0, Math.min(1, v));
}

/** Pixel coords inside SVG viewBox from client pointer position. */
export function curveClientToSvgCoords(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  graphWidth: number,
  graphHeight: number
): { px: number; py: number } {
  const scaleX = graphWidth / rect.width;
  const scaleY = graphHeight / rect.height;
  return {
    px: (clientX - rect.left) * scaleX,
    py: (clientY - rect.top) * scaleY,
  };
}

/** Scale client coordinates into SVG viewBox space and normalized t/v. */
export function curveClientToGraph(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  graphWidth: number,
  graphHeight: number,
  pad: CurveEditorPadding = GRAPH_PADDING,
  viewport: CurveEditorTimeViewport = CURVE_EDITOR_DEFAULT_TIME_VIEWPORT
): { x: number; y: number; t: number; v: number } {
  const scaleX = graphWidth / rect.width;
  const scaleY = graphHeight / rect.height;
  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;
  return {
    x,
    y,
    t: curveXToTime(x, graphWidth, pad, viewport),
    v: curveYToValue(y, graphHeight, pad),
  };
}

export function curveKeyframeCenterScreen(
  index: number,
  keyframesSorted: ReadonlyArray<{ time: number; value: number }>,
  rect: DOMRect,
  graphWidth: number,
  graphHeight: number,
  pad: CurveEditorPadding = GRAPH_PADDING,
  viewport: CurveEditorTimeViewport = CURVE_EDITOR_DEFAULT_TIME_VIEWPORT
): { x: number; y: number } | null {
  const kf = keyframesSorted[index];
  if (!kf) return null;
  const kx = curveTimeToX(kf.time, graphWidth, pad, viewport);
  const ky = curveValueToY(kf.value, graphHeight, pad);
  return {
    x: rect.left + (kx / graphWidth) * rect.width,
    y: rect.top + (ky / graphHeight) * rect.height,
  };
}

export function diamondPolygonPoints(cx: number, cy: number, apexR: number): string {
  return `${cx},${cy - apexR} ${cx + apexR},${cy} ${cx},${cy + apexR} ${cx - apexR},${cy}`;
}
