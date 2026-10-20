import type { NextFunction, Request, Response } from 'express';
import { levelFor } from '../permissions';
import { AppError } from '../utils/AppError';

/**
 * Checks the permission matrix for a screen.
 *  - read: any level allows it.
 *  - write: a read-only level is rejected.
 * When the level is `scoped`, the handler must limit the data to the user's own classes, subjects or
 * children: use `req.accessLevel` and `services/scope.ts`.
 */
export function authorize(screenId: string, action: 'read' | 'write' = 'read') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AppError(401, 'UNAUTHENTICATED', 'נדרשת התחברות'));
    const level = levelFor(req.user.roles, screenId);
    if (!level) return next(new AppError(403, 'FORBIDDEN', 'אין הרשאה לפעולה זו'));
    if (action === 'write' && level === 'read') {
      return next(new AppError(403, 'READ_ONLY', 'יש הרשאת צפייה בלבד'));
    }
    req.accessLevel = level;
    next();
  };
}
