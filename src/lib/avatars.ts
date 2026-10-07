/** Danh sách nhân vật (Kenney Mini Characters, CC0) - ảnh nằm trong public/avatars. */
export const AVATAR_IDS = [
  'male-a', 'female-a', 'male-b', 'female-b', 'male-c', 'female-c',
  'male-d', 'female-d', 'male-e', 'female-e', 'male-f', 'female-f',
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

export const DEFAULT_AVATAR: AvatarId = 'male-d';

export function isAvatarId(value: unknown): value is AvatarId {
  return typeof value === 'string' && (AVATAR_IDS as readonly string[]).includes(value);
}

export function avatarUrl(id: AvatarId): string {
  return `/avatars/${id}.png`;
}
