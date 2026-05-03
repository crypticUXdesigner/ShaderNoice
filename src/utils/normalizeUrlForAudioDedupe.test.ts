import { describe, expect, it } from 'vitest';
import { normalizeUrlForAudioDedupe } from './normalizeUrlForAudioDedupe';

describe('normalizeUrlForAudioDedupe', () => {
  it('trims and lowercases host', () => {
    expect(normalizeUrlForAudioDedupe('  https://CDN.Example.COM/path/a.mp3 ')).toBe(
      'https://cdn.example.com/path/a.mp3',
    );
  });

  it('sorts query parameters for stable comparison', () => {
    expect(
      normalizeUrlForAudioDedupe('https://cdn.test/t/x/track.mp3?b=2&a=1'),
    ).toBe(normalizeUrlForAudioDedupe('https://cdn.test/t/x/track.mp3?a=1&b=2'));
  });

  it('strips hash', () => {
    expect(normalizeUrlForAudioDedupe('https://h/x.mp3?v=1#frag')).toBe(
      'https://h/x.mp3?v=1',
    );
  });

  it('normalizes protocol-relative URLs', () => {
    expect(normalizeUrlForAudioDedupe('//cdn.example/track.mp3')).toBe(
      normalizeUrlForAudioDedupe('https://cdn.example/track.mp3'),
    );
  });

  it('collapses slashes in path-only URLs', () => {
    expect(normalizeUrlForAudioDedupe('/ShaderNoice//tracks//a.mp3')).toBe('/ShaderNoice/tracks/a.mp3');
  });

  it('sorts query on path-only URLs', () => {
    expect(normalizeUrlForAudioDedupe('/x.mp3?z=1&a=1')).toBe('/x.mp3?a=1&z=1');
  });
});
