import { describe, expect, it, vi } from 'vitest';
import {
  getAudiotoolCdnTrackMp3Url,
  resolvePlaylistTrackMp3UrlWithSource,
  type TracksDataMap,
} from './tracksData';
import * as playbackUrls from '../utils/audiotoolPlaylistPlaybackUrls';

describe('resolvePlaylistTrackMp3UrlWithSource', () => {
  it('prefers bundled tracks-data entry', () => {
    const data: TracksDataMap = {
      'tracks/b1': {
        name: 'B',
        displayName: 'B',
        mp3Url: 'https://bundled.example/track.mp3',
      },
    };
    const r = resolvePlaylistTrackMp3UrlWithSource(data, 'tracks/b1');
    expect(r.source).toBe('bundled');
    expect(r.url).toBe('https://bundled.example/track.mp3');
  });

  it('uses registry when bundled misses', () => {
    vi.spyOn(playbackUrls, 'getAudiotoolPlaylistTrackPlaybackUrl').mockReturnValue(
      'https://api.example/u.mp3'
    );
    const data: TracksDataMap = {};
    const r = resolvePlaylistTrackMp3UrlWithSource(data, 'tracks/x');
    expect(r.source).toBe('registry');
    expect(r.url).toBe('https://api.example/u.mp3');
    vi.restoreAllMocks();
  });

  it('falls back to heuristic CDN when bundled and registry miss', () => {
    vi.spyOn(playbackUrls, 'getAudiotoolPlaylistTrackPlaybackUrl').mockReturnValue(undefined);
    const data: TracksDataMap = {};
    const tid = 'tracks/abc';
    const r = resolvePlaylistTrackMp3UrlWithSource(data, tid);
    expect(r.source).toBe('cdn');
    expect(r.url).toBe(getAudiotoolCdnTrackMp3Url(tid));
    vi.restoreAllMocks();
  });

  it('returns none for non-tracks id', () => {
    vi.spyOn(playbackUrls, 'getAudiotoolPlaylistTrackPlaybackUrl').mockReturnValue(undefined);
    const data: TracksDataMap = {};
    const r = resolvePlaylistTrackMp3UrlWithSource(data, 'nope');
    expect(r.source).toBe('none');
    expect(r.url).toBeUndefined();
    vi.restoreAllMocks();
  });
});
