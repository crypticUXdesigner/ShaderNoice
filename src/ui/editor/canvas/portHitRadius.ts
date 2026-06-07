/**
 * Screen-space port hit radius helpers for zoom-invariant canvas hit testing.
 */

import { getCSSVariableAsNumber } from '../../../utils/cssTokens';

/** Convert a screen-pixel radius to canvas units at the given zoom level. */
export function screenHitRadiusToCanvas(screenRadius: number, zoom: number): number {
  if (!Number.isFinite(screenRadius) || screenRadius <= 0) return 0;
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  return screenRadius / safeZoom;
}

export function getHeaderPortHitRadiusCanvas(zoom: number): number {
  const screenRadius = getCSSVariableAsNumber('port-hit-radius-screen', 22);
  return screenHitRadiusToCanvas(screenRadius, zoom);
}

export function getParamPortHitRadiusCanvas(zoom: number): number {
  const screenRadius = getCSSVariableAsNumber('param-port-hit-radius-screen', 24);
  return screenHitRadiusToCanvas(screenRadius, zoom);
}

export function getConnectionDragPreviewThresholdCanvas(zoom: number): number {
  const screenThreshold = getCSSVariableAsNumber('connection-drag-preview-threshold-screen', 5);
  return screenHitRadiusToCanvas(screenThreshold, zoom);
}

export function getConnectMagneticRadiusScreen(): number {
  return getCSSVariableAsNumber('connect-magnetic-radius-screen', 24);
}
