/** SVG graph layout: normalized time horizontal, value vertical. */

export const GRAPH_PADDING = { top: 8, right: 8, bottom: 24, left: 36 } as const;

export type CurveEditorPadding = typeof GRAPH_PADDING;

export function curveTimeToX(
  t: number,
  graphWidth: number,
  pad: CurveEditorPadding = GRAPH_PADDING
): number {
  return pad.left + t * (graphWidth - pad.left - pad.right);
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
  pad: CurveEditorPadding = GRAPH_PADDING
): number {
  const w = graphWidth - pad.left - pad.right;
  if (w <= 0) return 0;
  const t = (x - pad.left) / w;
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
  pad: CurveEditorPadding = GRAPH_PADDING
): { x: number; y: number; t: number; v: number } {
  const scaleX = graphWidth / rect.width;
  const scaleY = graphHeight / rect.height;
  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;
  return {
    x,
    y,
    t: curveXToTime(x, graphWidth, pad),
    v: curveYToValue(y, graphHeight, pad),
  };
}

export function curveKeyframeCenterScreen(
  index: number,
  keyframesSorted: ReadonlyArray<{ time: number; value: number }>,
  rect: DOMRect,
  graphWidth: number,
  graphHeight: number,
  pad: CurveEditorPadding = GRAPH_PADDING
): { x: number; y: number } | null {
  const kf = keyframesSorted[index];
  if (!kf) return null;
  const kx = curveTimeToX(kf.time, graphWidth, pad);
  const ky = curveValueToY(kf.value, graphHeight, pad);
  return {
    x: rect.left + (kx / graphWidth) * rect.width,
    y: rect.top + (ky / graphHeight) * rect.height,
  };
}

export function diamondPolygonPoints(cx: number, cy: number, apexR: number): string {
  return `${cx},${cy - apexR} ${cx + apexR},${cy} ${cx},${cy + apexR} ${cx - apexR},${cy}`;
}
