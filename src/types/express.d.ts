import type { Level, RoleKey } from '../permissions';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; institutionId: string; roles: RoleKey[] };
      /** The strongest access level the user has on the screen that was authorized. */
      accessLevel?: Level;
    }
  }
}

export {};
