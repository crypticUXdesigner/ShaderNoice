import type { NodeIconIdentifier } from '../../utils/iconsNodeRegistry';
import { getCanonicalIconIdForAlias } from '../../utils/canvas-icons';

/**
 * Whitelist of icons that show up in the project avatar picker.
 * Edit this list to control which icons are user-facing here.
 */
const PROJECT_AVATAR_NODE_ICONS_RAW: NodeIconIdentifier[] = [
  // Fields, patterns, noise
  'grid',
  'cell',
  'checkerboard',
  'dither',
  'grain',
  'noise',
  'particle',
  'dots',
  'spray',
  'scribble',
  'scribble-loop',

  // Waves / motion vibes
  'wave',
  'waves',
  'ripple',
  'trig-wave',
  'spiral',
  'tornado',

  // Light / color / grading
  'gradient',
  'rainbow',
  'vignette',
  'glow',
  'brightness',
  'contrast-2',
  'tone-curve',
  'color-wheel',
  'color-picker',
  'color-palette',

  // FX / distortion / glitch / scan
  'blur-circle',
  'displacement',
  'glitch',
  'glitch-block',
  'rgb-split',
  'scan',
  'scanline',
  'focus',

  // “Energy / sparkle / celestial” abstract motifs
  'sparkles',
  'meteor',
  'shooting-star',
  'planet',
  'disco-ball',

  // Balls (quick “vibe” avatars)
  'beach-ball',
  'basketball',
  'soccer-ball',
  'tennis-ball',
  'volleyball',
  'spinner-ball',

  // Orientation / transform (useful, but still visual)
  'rotate',
  'twist',
  'move',
  'resize',
  'reflect',
  'refract',
  'normalize',

  // Geometry (good “what does it look like?” signal)
  'circle',
  'circle-dashed',
  'square',
  'rectangle-dashed',
  'hexagon',
  'octagon',
  'pentagon',
  'triangle',
  'triangle-dashed',
  'cube',
  'sphere',
  'ring',
  'rings',
  'infinity',
];

/**
 * De-duplicate by canonical icon identity (Phosphor name + variant), while
 * preserving the first occurrence order.
 */
export const PROJECT_AVATAR_NODE_ICONS: readonly NodeIconIdentifier[] = (() => {
  const seen = new Set<string>();
  const unique: NodeIconIdentifier[] = [];

  for (const identifier of PROJECT_AVATAR_NODE_ICONS_RAW) {
    // Use canonical identity when available; otherwise namespace the raw identifier
    // to avoid accidental collisions with canonical-id strings.
    const canonical = getCanonicalIconIdForAlias(identifier) ?? `raw:${identifier}`;
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    unique.push(identifier);
  }

  // Hard guarantee: no duplicates by render identity.
  // If this ever trips, it means two identifiers resolve to the same phosphor+variant.
  const renderIdentities = unique.map((id) => getCanonicalIconIdForAlias(id) ?? `raw:${id}`);
  const renderIdentitySet = new Set(renderIdentities);
  if (renderIdentitySet.size !== renderIdentities.length) {
    const counts = new Map<string, number>();
    for (const key of renderIdentities) counts.set(key, (counts.get(key) ?? 0) + 1);
    const duplicates = [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key);
    throw new Error(`Duplicate project avatar icons by render identity: ${duplicates.join(', ')}`);
  }

  return unique;
})();

