import { describe, expect, it } from 'vitest';
import { nodeCategoryToCssSlug } from './nodeCategorySlug';

describe('nodeCategoryToCssSlug', () => {
  it('maps SDF, MIDI, and defaults unknown', () => {
    expect(nodeCategoryToCssSlug('SDF')).toBe('sdf');
    expect(nodeCategoryToCssSlug('MIDI')).toBe('midi');
    expect(nodeCategoryToCssSlug(undefined)).toBe('default');
    expect(nodeCategoryToCssSlug('UnknownCategory')).toBe('default');
  });
});
