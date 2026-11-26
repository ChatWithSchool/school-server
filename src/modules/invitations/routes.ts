import crypto from 'node:crypto';
import { Router } from 'express';
import { Institution, Invite } from '../../models';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';

/**
 * A02 · joining by invite. The screen has no collection of its own: it reads Invite and User
 * from the core (`import { Invite, User } from '../../models'`).
 * Server A: GET /invites/:token. Server B: POST /invites/:token/accept.
 *
 * The person opening the link has no account yet, so these endpoints are public
 * (`security: []` in the contract). The secret token in the link is the permission.
 */
const router = Router();
export const publicRouter = Router();

/** Long enough for any token we create; anything longer is not a real link. */
const MAX_TOKEN_LENGTH = 256;

export type InvitePreviewStatus = 'valid' | 'expired' | 'used';

/**
 * The status the screen needs. A revoked invite shows the same screen as an expired one
 * ("ask the administrator to invite you again"), without saying why.
 */
export function previewStatus(
  invite: { status: string; expiresAt: Date },
  now: Date = new Date(),
): InvitePreviewStatus {
  if (invite.status === 'accepted') return 'used';
  if (invite.status === 'pending' && invite.expiresAt > now) return 'valid';
  return 'expired';
}

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

// GET /api/invites/:token  (A02 · הצטרפות בהזמנה)
// התשובה זהה לסכמה InvitePreview בחוזה (openapi.yaml)
publicRouter.get(
  '/invites/:token',
  asyncHandler(async (req, res) => {
    const { token } = req.params;
    if (!token || token.length > MAX_TOKEN_LENGTH) {
      throw new AppError(400, 'VALIDATION_ERROR', 'קישור ההזמנה אינו תקין');
    }

    const invite = await Invite.findOne({ tokenHash: hashToken(token) }).lean();
    if (!invite) throw new AppError(404, 'NOT_FOUND', 'ההזמנה לא נמצאה');

    const inst = await Institution.findById(invite.institutionId).select('name').lean();
    if (!inst) throw new AppError(404, 'NOT_FOUND', 'ההזמנה לא נמצאה');

    res.json({
      institutionName: inst.name,
      role: invite.role,
      email: invite.email,
      status: previewStatus(invite),
    });
  }),
);

export default router;
