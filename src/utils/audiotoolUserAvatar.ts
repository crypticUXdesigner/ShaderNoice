import type { AudiotoolClient } from '@audiotool/nexus';

function userResourceName(userNameFromAuth: string): string {
  const t = userNameFromAuth.trim();
  if (!t.length) return '';
  if (t.startsWith('users/')) return t;
  return `users/${t}`;
}

/** Badge-sized variant of Audiotool `avatar_url` (see audiotool.user.v1.User). */
export function audiotoolAvatarUrlForBadge(original: string): string {
  if (!original.includes('.webp')) return original;
  return original.replace(/\/\d+x\d+\.webp/i, '/60x60.webp');
}

export interface AudiotoolUserProfileFields {
  /** Badge-sized `avatar_url`, or null if missing / error / empty. */
  avatarUrl: string | null;
  /** `User.display_name` from UserService; null if missing / error / empty. */
  displayName: string | null;
}

/**
 * Loads `avatar_url` and `display_name` for the signed-in user (one `getUser` call).
 * On RPC error, returns `{ avatarUrl: null, displayName: null }`.
 */
export async function fetchAudiotoolUserProfileFields(
  client: AudiotoolClient,
  userNameFromAuth: string
): Promise<AudiotoolUserProfileFields> {
  const name = userResourceName(userNameFromAuth);
  if (!name.length) return { avatarUrl: null, displayName: null };
  const res = await client.users.getUser({ name });
  if (res instanceof Error) return { avatarUrl: null, displayName: null };
  const u = res.user;
  const rawAvatar = u?.avatarUrl?.trim();
  const avatarUrl =
    rawAvatar?.length ? audiotoolAvatarUrlForBadge(rawAvatar) : null;
  const dn = u?.displayName?.trim();
  const displayName = dn?.length ? dn : null;
  return { avatarUrl, displayName };
}
