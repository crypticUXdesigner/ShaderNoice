/**
 * In-memory playback URLs for Audiotool `tracks/*` from TrackService (ListTracks / GetTrack).
 * Bundled `tracks-data.json` remains the source for demo tracks; API rows carry real `mp3_url` values.
 */

const byTrackId = new Map<string, string>();

export function registerAudiotoolPlaylistTrackPlaybackUrl(trackId: string, url: string | null | undefined): void {
  const id = trackId.trim();
  const u = typeof url === 'string' ? url.trim() : '';
  if (!id.startsWith('tracks/') || !/^https?:\/\//i.test(u)) return;
  byTrackId.set(id, u);
}

export function getAudiotoolPlaylistTrackPlaybackUrl(trackId: string): string | undefined {
  return byTrackId.get(trackId.trim());
}
