import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ROLE_KEYS, type RoleKey } from '../permissions';
import { AppError } from '../utils/AppError';

export type TokenPayload = { sub: string; institutionId: string; roles: RoleKey[] };

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

/** Requires a valid `Authorization: Bearer <token>` header and fills `req.user`. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'נדרשת התחברות'));
  }
  try {
    const p = jwt.verify(header.slice(7), env.JWT_SECRET) as jwt.JwtPayload & TokenPayload;
    const roles = (p.roles ?? []).filter((r): r is RoleKey =>
      (ROLE_KEYS as readonly string[]).includes(r),
    );
    req.user = { id: String(p.sub), institutionId: String(p.institutionId), roles };
    next();
  } catch {
    next(new AppError(401, 'INVALID_TOKEN', 'ההתחברות פגה, יש להתחבר מחדש'));
  }
}
