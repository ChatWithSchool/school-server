import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models';
import { requireAuth, signToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { landingFor, permissionsFor } from '../permissions';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('כתובת אימייל לא תקינה'),
  password: z.string().min(1, 'חובה להזין סיסמה'),
});

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

/** POST /api/auth/login: same error for an unknown user and a wrong password (no user enumeration). */
authRouter.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const user = await User.findOne({ email }).select('+passwordHash');
    const invalid = new AppError(401, 'INVALID_CREDENTIALS', 'האימייל או הסיסמה שגויים');
    if (!user || user.status !== 'active') throw invalid;
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError(429, 'ACCOUNT_LOCKED', 'יותר מדי ניסיונות. נסי שוב בעוד כמה דקות');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      user.failedLogins += 1;
      if (user.failedLogins >= MAX_FAILED) {
        user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000);
        user.failedLogins = 0;
      }
      await user.save();
      throw invalid;
    }
    user.failedLogins = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date();
    await user.save();
    const roles = user.roles as never[];
    const token = signToken({
      sub: String(user._id),
      institutionId: String(user.institutionId),
      roles,
    });
    res.json({ token, landing: landingFor(roles) });
  }),
);

/** GET /api/auth/me: the signed-in user with the permissions the client needs for navigation. */
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user!.id).lean();
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'נדרשת התחברות');
    const roles = req.user!.roles;
    res.json({
      user: {
        id: String(user._id),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles,
      },
      permissions: permissionsFor(roles),
      landing: landingFor(roles),
    });
  }),
);
