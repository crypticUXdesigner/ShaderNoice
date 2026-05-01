export interface TimelineTransformParams {
  duration: number;
  visibleDuration: number;
  panOffset: number;
  trackWidth: number;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function clampPanOffset(params: { panOffset: number; duration: number; visibleDuration: number }): number {
  const { duration, visibleDuration, panOffset } = params;
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  if (!Number.isFinite(visibleDuration) || visibleDuration <= 0) return 0;
  const maxPan = Math.max(0, duration - visibleDuration);
  return Math.max(0, Math.min(panOffset, maxPan));
}

/** Back-compat alias for older call sites. */
export function clampPan(panOffset: number, duration: number, visibleDuration: number): number {
  const maxPan = Math.max(0, duration - visibleDuration);
  return Math.max(0, Math.min(panOffset, maxPan));
}

export function timeToX(time: number, params: TimelineTransformParams): number {
  const { visibleDuration, panOffset, trackWidth } = params;
  if (!Number.isFinite(visibleDuration) || visibleDuration <= 0) return 0;
  if (!Number.isFinite(trackWidth) || trackWidth <= 0) return 0;
  return ((time - panOffset) / visibleDuration) * trackWidth;
}

export function xToTime(x: number, params: TimelineTransformParams): number {
  const { visibleDuration, panOffset, trackWidth } = params;
  if (!Number.isFinite(trackWidth) || trackWidth <= 0) return panOffset;
  return panOffset + (x / trackWidth) * visibleDuration;
}

export function getTimeFromClientXInRect(
  clientX: number,
  rect: DOMRect,
  params: TimelineTransformParams
): number {
  const { duration, trackWidth } = params;
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  if (!Number.isFinite(rect.width) || rect.width <= 0) return 0;
  if (!Number.isFinite(trackWidth) || trackWidth <= 0) return 0;
  const xPx = clamp01((clientX - rect.left) / rect.width) * rect.width;
  const x = (xPx / rect.width) * trackWidth;
  const t = xToTime(x, params);
  return Math.max(0, Math.min(duration, t));
}

