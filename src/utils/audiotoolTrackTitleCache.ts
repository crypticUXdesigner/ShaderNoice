/**
 * Session-scoped titles for Audiotool `tracks/*` ids — from ListTracks / GetTrack /
 * hydration. Persisted playlist primary still wins per resolvePlaylistTrackLabel policy.
 */

const byTrackId = new Map<string, string>();

/** Non-empty trimmed title, keyed by canonical track resource name */
export function getAudiotoolTrackDisplayNameCache(trackId: string): string | undefined {
  const s = byTrackId.get(trackId.trim());
  const t = s?.trim();
  return t?.length ? t : undefined;
}

export function setAudiotoolTrackDisplayNameCache(trackId: string, displayName: string): void {
  const id = trackId.trim();
  const d = displayName.trim();
  if (!id.length || !d.length) return;
  byTrackId.set(id, d);
}
