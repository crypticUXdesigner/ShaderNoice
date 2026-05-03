/**
 * Central policy for playlist track labels (bottom bar + future surfaces).
 * Order: bundled catalog → persisted displayName → session cache → abbreviated fallback.
 */

import type { PlaylistPrimarySource } from '../data-model/audioSetupTypes';
import type { TracksDataMap } from '../runtime/tracksData';
import { getAudiotoolTrackDisplayNameCache } from './audiotoolTrackTitleCache';

export type PlaylistTrackLabelSource =
  | 'bundled'
  | 'persisted'
  | 'cache'
  /** Abbreviated id — not raw canonical resource string in UX */
  | 'fallback';

export interface PlaylistTrackLabelResult {
  text: string;
  source: PlaylistTrackLabelSource;
  canonicalId: string;
  isFallback: boolean;
}

/**
 * Fallback when no human-readable metadata exists (avoid exposing full `tracks/…`).
 */
export function abbreviateAudiotoolTrackResourceId(trackId: string): string {
  const t = trackId.trim();
  if (!t.startsWith('tracks/')) return t || 'Audiotool track';
  const rest = t.slice('tracks/'.length).replace(/^\/+|\/+$/g, '');
  if (rest.length === 0) return 'Audiotool track';
  if (rest.length <= 12) return `Audiotool track · ${rest}`;
  return `Audiotool track · …${rest.slice(-8)}`;
}

/**
 * Resolved label for `tracks/*` (and bundled ids) playlist primaries.
 * `persistedPlaylist` typically comes from `primarySource` when `type === 'playlist'`.
 */
export function resolvePlaylistTrackLabel(
  trackId: string,
  options: {
    bundledCatalog?: TracksDataMap | null;
    persistedPlaylist?: Pick<PlaylistPrimarySource, 'displayName'> | undefined;
  }
): PlaylistTrackLabelResult {
  const id = trackId.trim();
  const bundled = options.bundledCatalog?.[id];
  const bundledTitle = (bundled?.displayName ?? bundled?.name)?.trim();
  if (bundledTitle) {
    return { text: bundledTitle, source: 'bundled', canonicalId: id, isFallback: false };
  }

  const persisted = options.persistedPlaylist?.displayName?.trim();
  if (persisted) {
    return { text: persisted, source: 'persisted', canonicalId: id, isFallback: false };
  }

  const cached = getAudiotoolTrackDisplayNameCache(id);
  if (cached) {
    return { text: cached, source: 'cache', canonicalId: id, isFallback: false };
  }

  const abbr = abbreviateAudiotoolTrackResourceId(id);
  return { text: abbr, source: 'fallback', canonicalId: id, isFallback: true };
}
