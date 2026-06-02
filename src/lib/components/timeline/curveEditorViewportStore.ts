import {
  CURVE_EDITOR_DEFAULT_TIME_VIEWPORT,
  normalizeCurveEditorTimeViewport,
  type CurveEditorTimeViewport,
} from './curveEditorGeometry';

const viewportByTarget = new Map<string, CurveEditorTimeViewport>();

export function curveEditorViewportKey(laneId: string, regionId: string): string {
  return `${laneId}\u0000${regionId}`;
}

export function readCurveEditorViewport(key: string): CurveEditorTimeViewport {
  return viewportByTarget.get(key) ?? CURVE_EDITOR_DEFAULT_TIME_VIEWPORT;
}

export function writeCurveEditorViewport(key: string, viewport: CurveEditorTimeViewport): void {
  viewportByTarget.set(key, normalizeCurveEditorTimeViewport(viewport));
}

/** Test-only: clear persisted viewports between cases. */
export function clearCurveEditorViewportStoreForTests(): void {
  viewportByTarget.clear();
}
