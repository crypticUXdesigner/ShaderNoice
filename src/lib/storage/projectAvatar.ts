/**
 * Local project row appearance (avatar): node icon + bg + icon color from design tokens.
 */

import type { NodeIconIdentifier } from '../../utils/iconsNodeRegistry';
import type { ProjectMeta } from './projectRepository';
import { PROJECT_AVATAR_NODE_ICONS } from './projectAvatarIcons';
export { PROJECT_AVATAR_NODE_ICONS } from './projectAvatarIcons';

/**
 * Single user-facing palette for both background and icon colors.
 * The picker should offer the exact same options for both fields.
 */
export const PROJECT_AVATAR_COLOR_TOKENS = [
  // 12 hues as base.
  // First: 12× "-gray" in -60, then -70, -100, -120. Then the same for the non "-gray" version.

  // -gray-60
  'blue-gray-60',
  'cyan-gray-60',
  'teal-gray-60',
  'leaf-gray-60',
  'yellow-gray-60',
  'orange-gray-60',
  'orange-red-gray-60',
  'red-gray-60',
  'red-purple-gray-60',
  'purple-gray-60',
  'violet-gray-60',
  'red-orange-gray-60',

  // -gray-70
  'blue-gray-70',
  'cyan-gray-70',
  'teal-gray-70',
  'leaf-gray-70',
  'yellow-gray-70',
  'orange-gray-70',
  'orange-red-gray-70',
  'red-gray-70',
  'red-purple-gray-70',
  'purple-gray-70',
  'violet-gray-70',
  'red-orange-gray-70',

  // -gray-100
  'blue-gray-100',
  'cyan-gray-100',
  'teal-gray-100',
  'leaf-gray-100',
  'yellow-gray-100',
  'orange-gray-100',
  'orange-red-gray-100',
  'red-gray-100',
  'red-purple-gray-100',
  'purple-gray-100',
  'violet-gray-100',
  'red-orange-gray-100',

  // -gray-120
  'blue-gray-120',
  'cyan-gray-120',
  'teal-gray-120',
  'leaf-gray-120',
  'yellow-gray-120',
  'orange-gray-120',
  'orange-red-gray-120',
  'red-gray-120',
  'red-purple-gray-120',
  'purple-gray-120',
  'violet-gray-120',
  'red-orange-gray-120',

  // -60
  'blue-60',
  'cyan-60',
  'teal-60',
  'leaf-60',
  'yellow-60',
  'orange-60',
  'orange-red-60',
  'red-60',
  'red-purple-60',
  'purple-60',
  'violet-60',
  'red-orange-60',

  // -70
  'blue-70',
  'cyan-70',
  'teal-70',
  'leaf-70',
  'yellow-70',
  'orange-70',
  'orange-red-70',
  'red-70',
  'red-purple-70',
  'purple-70',
  'violet-70',
  'red-orange-70',

  // -100
  'blue-100',
  'cyan-100',
  'teal-100',
  'leaf-100',
  'yellow-100',
  'orange-100',
  'orange-red-100',
  'red-100',
  'red-purple-100',
  'purple-100',
  'violet-100',
  'red-orange-100',

  // -120
  'blue-120',
  'cyan-120',
  'teal-120',
  'leaf-120',
  'yellow-120',
  'orange-120',
  'orange-red-120',
  'red-120',
  'red-purple-120',
  'purple-120',
  'violet-120',
  'red-orange-120',
] as const;

export type ProjectAvatarColorToken = (typeof PROJECT_AVATAR_COLOR_TOKENS)[number];
export type ProjectAvatarBgToken = ProjectAvatarColorToken;
export type ProjectAvatarIconColorToken = ProjectAvatarColorToken;

const TOKEN_SET = new Set<string>(PROJECT_AVATAR_COLOR_TOKENS);
const ICON_SET = new Set<string>(PROJECT_AVATAR_NODE_ICONS);

/** Matches pre-avatar `ProjectListItem` look (tinted tile + neutral glyph). */
export const DEFAULT_PROJECT_AVATAR_NODE_ICON: NodeIconIdentifier = 'sphere';
export const DEFAULT_PROJECT_AVATAR_BG_TOKEN: ProjectAvatarBgToken = 'orange-red-gray-60';
export const DEFAULT_PROJECT_AVATAR_ICON_COLOR_TOKEN: ProjectAvatarIconColorToken = 'blue-gray-120';

export interface ProjectAvatarFields {
  avatarNodeIcon: NodeIconIdentifier;
  avatarBgToken: ProjectAvatarBgToken;
  avatarIconColorToken: ProjectAvatarIconColorToken;
}

/** Full rows for new projects — one picked at random on create. */
export const PROJECT_AVATAR_PRESETS: readonly ProjectAvatarFields[] = [
  // Gray backgrounds → solid light icons
  { avatarNodeIcon: 'sphere', avatarBgToken: 'orange-red-gray-60', avatarIconColorToken: 'orange-red-120' },
  { avatarNodeIcon: 'hexagon', avatarBgToken: 'teal-gray-70', avatarIconColorToken: 'teal-120' },
  { avatarNodeIcon: 'waves', avatarBgToken: 'cyan-gray-70', avatarIconColorToken: 'cyan-120' },
  { avatarNodeIcon: 'ripple', avatarBgToken: 'blue-gray-70', avatarIconColorToken: 'blue-120' },
  { avatarNodeIcon: 'kaleidoscope', avatarBgToken: 'purple-gray-70', avatarIconColorToken: 'purple-120' },
  { avatarNodeIcon: 'blur-circle', avatarBgToken: 'red-purple-gray-70', avatarIconColorToken: 'red-purple-120' },
  { avatarNodeIcon: 'noise', avatarBgToken: 'violet-gray-70', avatarIconColorToken: 'violet-120' },
  { avatarNodeIcon: 'sunrise', avatarBgToken: 'yellow-gray-70', avatarIconColorToken: 'yellow-120' },
  { avatarNodeIcon: 'atom-2', avatarBgToken: 'leaf-gray-70', avatarIconColorToken: 'leaf-120' },
  { avatarNodeIcon: 'cube', avatarBgToken: 'orange-gray-70', avatarIconColorToken: 'orange-120' },

  // Solid backgrounds → gray-tinted light icons (keeps glyph legible without “white”)
  { avatarNodeIcon: 'gradient', avatarBgToken: 'teal-70', avatarIconColorToken: 'teal-gray-120' },
  { avatarNodeIcon: 'glow', avatarBgToken: 'cyan-70', avatarIconColorToken: 'cyan-gray-120' },
  { avatarNodeIcon: 'infinity', avatarBgToken: 'blue-70', avatarIconColorToken: 'blue-gray-120' },
  { avatarNodeIcon: 'rings', avatarBgToken: 'purple-70', avatarIconColorToken: 'purple-gray-120' },
  { avatarNodeIcon: 'sparkles-2', avatarBgToken: 'red-70', avatarIconColorToken: 'red-gray-120' },
  { avatarNodeIcon: 'spiral', avatarBgToken: 'violet-70', avatarIconColorToken: 'violet-gray-120' },
  { avatarNodeIcon: 'topology-star-ring', avatarBgToken: 'yellow-70', avatarIconColorToken: 'yellow-gray-120' },
  { avatarNodeIcon: 'ikosaedr', avatarBgToken: 'leaf-70', avatarIconColorToken: 'leaf-gray-120' },
];

export function pickRandomProjectAvatarPreset(): ProjectAvatarFields {
  const i = Math.floor(Math.random() * PROJECT_AVATAR_PRESETS.length);
  return PROJECT_AVATAR_PRESETS[i] ?? PROJECT_AVATAR_PRESETS[0]!;
}

export function projectAvatarColorVar(token: string): string {
  return `var(--color-${token})`;
}

function isNodeIconAllowed(id: string): id is NodeIconIdentifier {
  return ICON_SET.has(id);
}

function isBgToken(id: string): id is ProjectAvatarBgToken {
  return TOKEN_SET.has(id);
}

function isFgToken(id: string): id is ProjectAvatarIconColorToken {
  return TOKEN_SET.has(id);
}

/** Normalize stored meta to safe token + icon values (legacy rows → defaults). */
export function resolveProjectAvatar(meta: Partial<ProjectMeta> | undefined): ProjectAvatarFields {
  const rawIcon = meta?.avatarNodeIcon?.trim();
  const rawBg = meta?.avatarBgToken?.trim();
  const rawFg = meta?.avatarIconColorToken?.trim();
  // `grain`, `noise`, and `particle` are aliases of the same rendered Phosphor icon.
  // The avatar picker whitelist intentionally de-dupes by render identity, so only one
  // of these identifiers will be allowed. Normalize all legacy/stored values to the
  // allowed one so the choice is selectable + round-trips reliably.
  const normalizedIcon = rawIcon === 'noise' || rawIcon === 'particle' ? 'grain' : rawIcon;

  return {
    avatarNodeIcon:
      normalizedIcon && isNodeIconAllowed(normalizedIcon) ? normalizedIcon : DEFAULT_PROJECT_AVATAR_NODE_ICON,
    avatarBgToken: rawBg && isBgToken(rawBg) ? rawBg : DEFAULT_PROJECT_AVATAR_BG_TOKEN,
    avatarIconColorToken:
      rawFg && isFgToken(rawFg) ? rawFg : DEFAULT_PROJECT_AVATAR_ICON_COLOR_TOKEN,
  };
}
