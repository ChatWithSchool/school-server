import matrix from './matrix.json';

export const ROLE_KEYS = [
  'management',
  'coordinator',
  'secretary',
  'homeroom',
  'teacher',
  'parent',
  'student',
] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];
/** full = full access, scoped = only own classes, subjects or children, read = view only */
export type Level = 'full' | 'scoped' | 'read';

const ORDER: Record<Level, number> = { read: 1, scoped: 2, full: 3 };

type ScreenEntry = { name: string; module: string; access: Partial<Record<RoleKey, Level>> };
const screens = matrix.screens as unknown as Record<string, ScreenEntry>;

/** The strongest level any of the roles has on a screen, or null when none has access. */
export function levelFor(roles: RoleKey[], screenId: string): Level | null {
  const entry = screens[screenId];
  if (!entry) return null;
  let best: Level | null = null;
  for (const role of roles) {
    const level = entry.access[role];
    if (level && (!best || ORDER[level] > ORDER[best])) best = level;
  }
  return best;
}

/** All screens and levels for a user: the client uses it to show or hide navigation. */
export function permissionsFor(roles: RoleKey[]): Record<string, Level> {
  const out: Record<string, Level> = {};
  for (const id of Object.keys(screens)) {
    const level = levelFor(roles, id);
    if (level) out[id] = level;
  }
  return out;
}

export function landingFor(roles: RoleKey[]): string {
  const order: [RoleKey, string][] = [
    ['management', 'X03'],
    ['secretary', 'S01'],
    ['homeroom', 'T06'],
    ['teacher', 'T06'],
    ['parent', 'S03'],
    ['student', 'G02'],
  ];
  for (const [role, screen] of order) if (roles.includes(role)) return screen;
  return 'X02';
}
