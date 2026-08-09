import { describe, it, expect, vi } from 'vitest';
import type { AudioSetup } from '../../data-model/audioSetupTypes';
import {
  audiotoolPlaylistHydrateTrackId,
  applyPlaylistAdvanceFromBundledCatalog,
} from './audiotoolEditorWiring';

vi.mock('../../runtime/tracksData', () => ({
  getTracksData: async () => ({}),
  playlistPrimaryFromBundledCatalog: () => {
    throw new Error('should not call when index is out of order');
  },
}));

describe('audiotoolPlaylistHydrateTrackId', () => {
  it('returns tracks/* playlist ids only', () => {
    expect(audiotoolPlaylistHydrateTrackId(undefined)).toBeNull();
    expect(
      audiotoolPlaylistHydrateTrackId({
        type: 'upload',
        file: {
          id: 'f1',
          name: 'a.mp3',
          autoPlay: false,
        },
      })
    ).toBeNull();
    expect(
      audiotoolPlaylistHydrateTrackId({
        type: 'playlist',
        trackId: 'other/foo',
        displayName: 'x',
      })
    ).toBeNull();
    expect(
      audiotoolPlaylistHydrateTrackId({
        type: 'playlist',
        trackId: '  tracks/abc  ',
        displayName: 'x',
      })
    ).toBe('tracks/abc');
  });
});

describe('applyPlaylistAdvanceFromBundledCatalog', () => {
  it('no-ops when index is out of order', async () => {
    const commit = vi.fn();
    const play = vi.fn();
    const setup: AudioSetup = {
      files: [],
      bands: [],
      remappers: [],
      playlistState: { order: ['tracks/a'], currentIndex: 0, loopCurrentTrack: false },
    };
    await applyPlaylistAdvanceFromBundledCatalog({
      nextIndex: 5,
      getAudioSetup: () => setup,
      commitAudioSetup: commit,
      playPrimary: play,
    });
    expect(commit).not.toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();
  });
});
