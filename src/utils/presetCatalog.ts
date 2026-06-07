import type { IconName } from './iconsUiRegistry';



/** Bundled preset hub tiers (top → bottom in Start tab). */

export type PresetTier = 'showcases' | 'technical';



export interface PresetListEntry {

  name: string;

  displayName: string;

}



export interface PresetTierDefinition {

  id: PresetTier;

  label: string;

}



export const PRESET_TIERS: PresetTierDefinition[] = [

  { id: 'showcases', label: 'Showcases' },

  { id: 'technical', label: 'Examples' },

];



/** Curated order within each tier; unlisted presets sort after these, then A–Z. */

export const PRESET_ORDER: Record<PresetTier, readonly string[]> = {

  showcases: ['watercolor-waves', 'rorschach'],

  technical: ['pixelize'],

};



const PRESET_TIER_BY_NAME: Record<string, PresetTier> = Object.fromEntries(

  (Object.entries(PRESET_ORDER) as [PresetTier, readonly string[]][]).flatMap(([tier, names]) =>

    names.map((name) => [name, tier] as const)

  )

) as Record<string, PresetTier>;



const PRESET_ICON_BY_NAME: Partial<Record<string, IconName>> = {

  rorschach: 'square-split-horizontal',

  'watercolor-waves': 'wave-sine',

};



export type PresetChipCategory = 'audio' | 'effects' | 'sdf';



const PRESET_CHIP_BY_NAME: Partial<Record<string, PresetChipCategory>> = {};



export function resolvePresetTier(presetName: string): PresetTier {

  return PRESET_TIER_BY_NAME[presetName] ?? 'technical';

}



export function resolvePresetDisplayName(preset: PresetListEntry): string {

  return preset.displayName;

}



export function resolvePresetIcon(presetName: string): IconName {

  return PRESET_ICON_BY_NAME[presetName] ?? 'preset';

}



export function resolvePresetChipCategory(presetName: string): PresetChipCategory {

  return PRESET_CHIP_BY_NAME[presetName] ?? 'effects';

}



export function comparePresetsInTier(a: PresetListEntry, b: PresetListEntry, tier: PresetTier): number {

  const order = PRESET_ORDER[tier];

  const ai = order.indexOf(a.name);

  const bi = order.indexOf(b.name);

  const aRank = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;

  const bRank = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;

  if (aRank !== bRank) return aRank - bRank;

  return resolvePresetDisplayName(a).localeCompare(resolvePresetDisplayName(b));

}



export function bucketPresetsByTier(

  presets: PresetListEntry[]

): Record<PresetTier, PresetListEntry[]> {

  const buckets: Record<PresetTier, PresetListEntry[]> = {

    showcases: [],

    technical: [],

  };

  for (const preset of presets) {

    buckets[resolvePresetTier(preset.name)].push(preset);

  }

  for (const tier of PRESET_TIERS) {

    buckets[tier.id].sort((a, b) => comparePresetsInTier(a, b, tier.id));

  }

  return buckets;

}



/** Every bundled preset filename (no extension) must appear in PRESET_ORDER. */

export function assertPresetCatalogCovers(names: readonly string[]): void {

  const cataloged = new Set(Object.keys(PRESET_TIER_BY_NAME));

  const missing = names.filter((n) => !cataloged.has(n));

  const extra = [...cataloged].filter((n) => !names.includes(n));

  const problems: string[] = [];

  if (missing.length > 0) {

    problems.push(`missing from preset catalog: ${missing.join(', ')}`);

  }

  if (extra.length > 0) {

    problems.push(`stale preset catalog entries: ${extra.join(', ')}`);

  }

  if (problems.length > 0) {

    throw new Error(problems.join('; '));

  }

}


