/**
 * Shared cubic-bezier routing for node-editor connection wires.
 * Used by committed wire renderers, preview, hit-testing, and dirty regions.
 */

export type ConnectionPortSide = 'left' | 'right';

export interface Point2D {
  x: number;
  y: number;
}

export interface BezierControlPoints {
  cp1: Point2D;
  cp2: Point2D;
}

export const CONNECTION_BEZIER_MIN_TANGENT = 48;
export const CONNECTION_BEZIER_MAX_TANGENT = 160;
export const CONNECTION_BEZIER_TANGENT_SCALE = 0.5;

/** Node output = right; input and parameter ports = left. */
export function portSideFromEndpoint(isOutput: boolean): ConnectionPortSide {
  return isOutput ? 'right' : 'left';
}

export function computeConnectionBezierControlPoints(
  source: Point2D,
  target: Point2D,
  sourceSide: ConnectionPortSide,
  targetSide: ConnectionPortSide,
  options?: {
    minTangent?: number;
    maxTangent?: number;
    scale?: number;
  }
): BezierControlPoints {
  const minTangent = options?.minTangent ?? CONNECTION_BEZIER_MIN_TANGENT;
  const maxTangent = options?.maxTangent ?? CONNECTION_BEZIER_MAX_TANGENT;
  const scale = options?.scale ?? CONNECTION_BEZIER_TANGENT_SCALE;

  const dx = target.x - source.x;
  const dist = Math.hypot(dx, target.y - source.y);

  let tangent = Math.max(minTangent, Math.min(maxTangent, dist * scale));

  const backward =
    (sourceSide === 'right' && targetSide === 'left' && dx < 0) ||
    (sourceSide === 'left' && targetSide === 'right' && dx > 0);
  if (backward) {
    tangent = Math.max(minTangent, Math.abs(dx) + minTangent * 0.5);
  }

  const sourceSign = sourceSide === 'right' ? 1 : -1;
  const targetSign = targetSide === 'left' ? -1 : 1;

  return {
    cp1: { x: source.x + sourceSign * tangent, y: source.y },
    cp2: { x: target.x + targetSign * tangent, y: target.y },
  };
}

export function appendConnectionBezierToPath(
  path: Path2D,
  source: Point2D,
  target: Point2D,
  sourceSide: ConnectionPortSide = 'right',
  targetSide: ConnectionPortSide = 'left'
): void {
  const { cp1, cp2 } = computeConnectionBezierControlPoints(source, target, sourceSide, targetSide);
  path.moveTo(source.x, source.y);
  path.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, target.x, target.y);
}

export function buildConnectionBezierPath(
  source: Point2D,
  target: Point2D,
  sourceSide: ConnectionPortSide = 'right',
  targetSide: ConnectionPortSide = 'left'
): Path2D {
  const path = new Path2D();
  appendConnectionBezierToPath(path, source, target, sourceSide, targetSide);
  return path;
}

export function bezierPointAt(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  t: number
): Point2D {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * x0 + 3 * uu * t * x1 + 3 * u * tt * x2 + ttt * x3,
    y: uuu * y0 + 3 * uu * t * y1 + 3 * u * tt * y2 + ttt * y3,
  };
}

export function isPointNearConnectionBezier(
  px: number,
  py: number,
  source: Point2D,
  target: Point2D,
  threshold: number,
  sourceSide: ConnectionPortSide = 'right',
  targetSide: ConnectionPortSide = 'left'
): boolean {
  const { cp1, cp2 } = computeConnectionBezierControlPoints(source, target, sourceSide, targetSide);
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const curveLength = Math.hypot(dx, dy);
  const samples = Math.max(120, Math.ceil(curveLength / 3));
  let minDistance = Infinity;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const point = bezierPointAt(
      source.x,
      source.y,
      cp1.x,
      cp1.y,
      cp2.x,
      cp2.y,
      target.x,
      target.y,
      t
    );
    const dpx = px - point.x;
    const dpy = py - point.y;
    minDistance = Math.min(minDistance, Math.hypot(dpx, dpy));
  }
  return minDistance < threshold;
}

export function getConnectionBezierBounds(
  source: Point2D,
  target: Point2D,
  sourceSide: ConnectionPortSide = 'right',
  targetSide: ConnectionPortSide = 'left',
  sampleCount = 24
): { minX: number; minY: number; maxX: number; maxY: number } {
  const { cp1, cp2 } = computeConnectionBezierControlPoints(source, target, sourceSide, targetSide);
  let minX = Math.min(source.x, target.x, cp1.x, cp2.x);
  let maxX = Math.max(source.x, target.x, cp1.x, cp2.x);
  let minY = Math.min(source.y, target.y, cp1.y, cp2.y);
  let maxY = Math.max(source.y, target.y, cp1.y, cp2.y);

  for (let i = 1; i < sampleCount; i++) {
    const t = i / sampleCount;
    const point = bezierPointAt(
      source.x,
      source.y,
      cp1.x,
      cp1.y,
      cp2.x,
      cp2.y,
      target.x,
      target.y,
      t
    );
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, minY, maxX, maxY };
}

/** Preview endpoint side when the far end is a free-floating cursor. */
export function previewTargetPortSide(dragFromOutput: boolean): ConnectionPortSide {
  return dragFromOutput ? 'left' : 'right';
}

/** Marching-ants flow: output drags forward (source → target); input/param drags backward. */
export function connectionPreviewMarchForward(dragFromOutput: boolean): boolean {
  return dragFromOutput;
}
