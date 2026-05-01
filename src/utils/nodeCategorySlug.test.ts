import { describe, expect, it } from 'vitest';
import { nodeCategoryToCssSlug } from './nodeCategorySlug';

describe('nodeCategoryToCssSlug', () => {
  it('maps SDF and defaults unknown', () => {
    expect(nodeCategoryToCssSlug('SDF')).toBe('sdf');
    expect(nodeCategoryToCssSlug(undefined)).toBe('default');
    expect(nodeCategoryToCssSlug('UnknownCategory')).toBe('default');
  });
});
