/**
 * Main-thread hint so runtime can avoid noisy load errors for Audiotool `tracks/*`
 * playlist primaries: the first resolved URL is often a heuristic CDN path while
 * {@link ./audiotoolSessionRpc.ts} GetTrack (driven from App) has not yet registered
 * the real playback URL. Updated when OAuth session presence changes.
 */

let sessionAvailable = false;

export function setAudiotoolPlaylistLoadSessionAvailable(value: boolean): void {
  sessionAvailable = value;
}

/** True when signed in — GetTrack may fill the playback URL registry shortly after first load. */
export function audiotoolPlaylistLoadSessionMayHydrate(): boolean {
  return sessionAvailable;
}
