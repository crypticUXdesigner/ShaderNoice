/**
 * Audiotool editor-shell wiring: reconnect after disconnect, playlist advance, GetTrack hydrate.
 * Plain TS — App keeps `$effect` / `$state` and passes callbacks.
 */

import type { AudioSetup, PlaylistPrimarySource, PrimarySource } from '../../data-model';
import {
  getPrimaryFileId,
  retargetBandsToPrimary,
  setPlaylistCurrentIndex,
  setPrimarySource,
} from '../../data-model';
import {
  getTracksData,
  playlistPrimaryFromBundledCatalog,
} from '../../runtime/tracksData';
import {
  fetchAudiotoolTrackViaGetTrack,
  withAudiotoolUserSession,
} from '../../utils/audiotoolSessionRpc';
import { registerAudiotoolPlaylistTrackPlaybackUrl } from '../../utils/audiotoolPlaylistPlaybackUrls';
import { setAudiotoolTrackDisplayNameCache } from '../../utils/audiotoolTrackTitleCache';
import { initAudiotoolBrowserAuth } from '../../utils/audiotoolBrowserAuth';
import type { AudiotoolConnectionEvent } from '../../utils/audiotoolConnectionModel';

/** Re-offer top-bar sign-in after logout / session invalidation when OAuth gate is enabled. */
export async function reconnectAudiotoolLoginAfterDisconnect(deps: {
  useAudiotoolGate: boolean;
  dispatch: (event: AudiotoolConnectionEvent) => void;
}): Promise<void> {
  if (!deps.useAudiotoolGate) return;
  try {
    const auth = await initAudiotoolBrowserAuth();
    if (auth.status === 'unauthenticated') {
      const login = (): void => {
        auth.login();
      };
      deps.dispatch({ type: 'DISCONNECTED_LOGIN_RESTORED', login });
    }
  } catch {
    // Top bar sign-in may stay unavailable until reload; editor continues to work.
  }
}

/** `tracks/*` playlist id only — excludes display-metadata updates so hydration does not loop on graph saves. */
export function audiotoolPlaylistHydrateTrackId(
  primary: PrimarySource | null | undefined
): string | null {
  if (primary?.type !== 'playlist') return null;
  const tid = primary.trackId.trim();
  return tid.startsWith('tracks/') ? tid : null;
}

/**
 * Apply playlist index + primary from bundled catalog (runtime `onPlaylistAdvance`).
 */
export async function applyPlaylistAdvanceFromBundledCatalog(deps: {
  nextIndex: number;
  getAudioSetup: () => AudioSetup;
  commitAudioSetup: (setup: AudioSetup, opts?: { autoPlayWhenReady?: boolean }) => void;
  playPrimary: () => void;
}): Promise<void> {
  const data = await getTracksData();
  const live = deps.getAudioSetup();
  const order = live?.playlistState?.order ?? [];
  const trackId = order[deps.nextIndex];
  if (trackId == null) return;
  const prevPrimaryId = getPrimaryFileId(live);
  let setup = live;
  setup = setPlaylistCurrentIndex(setup, deps.nextIndex);
  setup = setPrimarySource(setup, playlistPrimaryFromBundledCatalog(trackId, data));
  const newPrimaryId = getPrimaryFileId(setup);
  setup = retargetBandsToPrimary(setup, prevPrimaryId, newPrimaryId);
  deps.commitAudioSetup(setup, { autoPlayWhenReady: true });
  deps.playPrimary();
}

export type AudiotoolPlaylistHydrateResult =
  | { kind: 'skipped' }
  | {
      kind: 'applied';
      /** When true, display name (and possibly primary) changed — caller should `commitAudioSetup`. */
      graphChanged: boolean;
      /** When false graph change but URL/title cache updated — caller may push audioSetup to runtime. */
      notifyRuntimeOnly: boolean;
      setup: AudioSetup;
    };

/**
 * Background hydrate: Audiotool GetTrack refreshes playback URL registry + persisted display title
 * outside bundled catalog. Caller supplies generation guard via `isStale`.
 */
export async function hydrateAudiotoolPlaylistTrack(deps: {
  trackId: string;
  session: Parameters<typeof withAudiotoolUserSession>[0];
  isStale: () => boolean;
  getAudioSetup: () => AudioSetup;
  /** Run store mutations outside reactive tracking (App uses `untrack`). */
  runUntracked: <T>(fn: () => T) => T;
}): Promise<AudiotoolPlaylistHydrateResult> {
  const data = await getTracksData();
  if (deps.isStale()) return { kind: 'skipped' };
  const bundledEntry = data[deps.trackId];
  const bundledTitle =
    bundledEntry?.displayName?.trim() ??
    (typeof bundledEntry?.name === 'string' ? bundledEntry.name.trim() : '');
  if (bundledTitle.length > 0) return { kind: 'skipped' };

  const res = await withAudiotoolUserSession(deps.session, (client) =>
    fetchAudiotoolTrackViaGetTrack(client, deps.trackId)
  );
  if (deps.isStale()) return { kind: 'skipped' };
  if (!res.ok || !res.value) return { kind: 'skipped' };

  const { playbackUrl, displayName: apiName } = res.value;
  if (playbackUrl) registerAudiotoolPlaylistTrackPlaybackUrl(deps.trackId, playbackUrl);
  const dn = apiName?.trim();
  if (dn?.length) setAudiotoolTrackDisplayNameCache(deps.trackId, dn);

  return deps.runUntracked(() => {
    const cur = deps.getAudioSetup().primarySource;
    if (cur?.type !== 'playlist' || cur.trackId.trim() !== deps.trackId) {
      return { kind: 'skipped' as const };
    }

    let setup = deps.getAudioSetup();
    let graphChanged = false;

    if (dn?.length && cur.displayName !== dn) {
      const merged: PlaylistPrimarySource = {
        ...cur,
        trackId: deps.trackId,
        displayName: dn,
        displayNameSource: 'audiotool',
        displayNameUpdatedAt: new Date().toISOString(),
      };
      setup = setPrimarySource(setup, merged);
      graphChanged = true;
    }

    const notifyRuntimeOnly =
      !graphChanged && (playbackUrl !== undefined || (dn?.length ?? 0) > 0);

    return {
      kind: 'applied' as const,
      graphChanged,
      notifyRuntimeOnly,
      setup,
    };
  });
}
