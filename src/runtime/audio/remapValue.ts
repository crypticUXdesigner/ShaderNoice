/**
 * Linear remap from [inMin, inMax] to [outMin, outMax] with clamp to [0, 1] in normalized space.
 * Shared by live uniforms, offline worker analysis, and Tier A curve patch (tasks 03+).
 */
export function remapValue(
  value: number | undefined | null,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  if (value === undefined || value === null) return (outMin + outMax) / 2;
  const range = inMax - inMin;
  const normalized = range !== 0 ? (value - inMin) / range : 0;
  const clamped = Math.max(0, Math.min(1, normalized));
  return outMin + clamped * (outMax - outMin);
}

/** Clamp interval for remap output (outMin may be numerically greater than outMax). */
export function remapOutputClampBounds(
  outMin: number,
  outMax: number
): { min: number; max: number } {
  return { min: Math.min(outMin, outMax), max: Math.max(outMin, outMax) };
}

/** Clamp a remapped scalar to the effective output range. */
export function clampRemapOutput(value: number, outMin: number, outMax: number): number {
  const { min, max } = remapOutputClampBounds(outMin, outMax);
  return Math.max(min, Math.min(max, value));
}

/**
 * Clamp using stored channel min/max metadata.
 * Tolerates legacy caches where min/outMin and max/outMax were written in remap order
 * even when inverted (min > max).
 */
export function clampToStoredChannelBounds(
  value: number,
  channelMin?: number,
  channelMax?: number
): number {
  if (channelMin === undefined && channelMax === undefined) return value;
  if (channelMin !== undefined && channelMax !== undefined) {
    const lo = Math.min(channelMin, channelMax);
    const hi = Math.max(channelMin, channelMax);
    return Math.max(lo, Math.min(hi, value));
  }
  if (channelMin !== undefined) return Math.max(channelMin, value);
  return Math.min(channelMax!, value);
}
