import { describe, expect, it } from 'vitest';

import { assertPresetCatalogCovers, bucketPresetsByTier, resolvePresetTier } from './presetCatalog';

import { listPresets } from './presetManager';



describe('presetCatalog', () => {

  it('covers every bundled preset file', async () => {

    const presets = await listPresets();

    assertPresetCatalogCovers(presets.map((p) => p.name));

  });



  it('assigns watercolor-waves and rorschach to showcases', async () => {

    expect(resolvePresetTier('watercolor-waves')).toBe('showcases');

    expect(resolvePresetTier('rorschach')).toBe('showcases');

  });



  it('assigns pixelize to technical examples', async () => {

    expect(resolvePresetTier('pixelize')).toBe('technical');

  });



  it('orders showcases before technical', async () => {

    const presets = await listPresets();

    const buckets = bucketPresetsByTier(presets);

    expect(buckets.showcases.map((p) => p.name)).toEqual(['watercolor-waves', 'rorschach']);

    expect(buckets.technical.map((p) => p.name)).toEqual(['pixelize']);

  });

});


