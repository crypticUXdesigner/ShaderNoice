import { describe, expect, it } from 'vitest';
import { abbreviateAudiotoolTrackResourceId, resolvePlaylistTrackLabel } from './playlistTrackLabel';

describe('playlistTrackLabel', () => {
  it('abbreviates tracks/ resource ids for fallback', () => {
    const id = 'tracks/abcdefgh-ijklmnop';
    expect(abbreviateAudiotoolTrackResourceId(id)).toMatch(/^Audiotool track · …/);
    expect(abbreviateAudiotoolTrackResourceId('file-1')).toBe('file-1');
  });

  it('prefers bundled catalog over persisted', () => {
    const r = resolvePlaylistTrackLabel('tracks/a', {
      bundledCatalog: {
        'tracks/a': { name: 'tracks/a', displayName: 'Bundled A', mp3Url: 'http://x/a.mp3' },
      },
      persistedPlaylist: { type: 'playlist', trackId: 'tracks/a', displayName: 'Saved old' },
    });
    expect(r.text).toBe('Bundled A');
    expect(r.source).toBe('bundled');
  });

  it('uses persisted when not in catalog', () => {
    const r = resolvePlaylistTrackLabel('tracks/z', {
      bundledCatalog: {},
      persistedPlaylist: { type: 'playlist', trackId: 'tracks/z', displayName: 'My title' },
    });
    expect(r.text).toBe('My title');
    expect(r.source).toBe('persisted');
  });

  it('abbreviates when no metadata', () => {
    const r = resolvePlaylistTrackLabel('tracks/zzzzzzxxxxxxxx', {
      bundledCatalog: null,
      persistedPlaylist: { type: 'playlist', trackId: 'tracks/zzzzzzxxxxxxxx' },
    });
    expect(r.isFallback).toBe(true);
    expect(r.source).toBe('fallback');
    expect(r.text).toContain('Audiotool track');
  });
});
