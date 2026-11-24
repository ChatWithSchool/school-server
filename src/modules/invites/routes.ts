import { Router } from 'express';
import type { FilterQuery } from 'mongoose';
import { z } from 'zod';
import { authorize } from '../../middleware/authorize';
import { Invite } from '../../models';
import { asyncHandler } from '../../utils/asyncHandler';
import { paginationSchema, toPage } from '../../utils/pagination';

/**
 * A07 · inviting users and pending invites. The screen has no collection of its own: it reads
 * Invite, User and Role from the core (`import { Invite, User, Role } from '../../models'`).
 * Server A: GET /invites. Server B: POST /invites and DELETE /invites/:id (writes to invites).
 */
const router = Router();

type InviteFilter = FilterQuery<Record<string, unknown>>;

export const INVITE_STATUSES = ['pending', 'accepted', 'revoked', 'expired'] as const;
export type InviteStatus = (typeof INVITE_STATUSES)[number];

export const listInvitesQuerySchema = paginationSchema.extend({
  status: z
    .enum(INVITE_STATUSES, {
      errorMap: () => ({ message: 'סטטוס לא תקין: pending, accepted, revoked או expired' }),
    })
    .optional(),
});

/**
 * A pending invite whose date has passed is expired, even before anything updates it in the
 * database: the list shows it as expired and `status=pending` leaves it out.
 */
export function effectiveStatus(
  invite: { status: string; expiresAt: Date },
  now: Date = new Date(),
): InviteStatus {
  if (invite.status === 'pending' && invite.expiresAt <= now) return 'expired';
  return invite.status as InviteStatus;
}

/** The database filter for a status, by the same rule as effectiveStatus. */
export function statusFilter(
  status: InviteStatus | undefined,
  now: Date = new Date(),
): InviteFilter {
  if (status === 'pending') return { status: 'pending', expiresAt: { $gt: now } };
  if (status === 'expired') {
    return { $or: [{ status: 'expired' }, { status: 'pending', expiresAt: { $lte: now } }] };
  }
  if (status) return { status };
  return {};
}

// GET /api/invites?status=pending&page=1&size=25  (A07 · הזמנות ממתינות)
// התשובה זהה לסכמה InvitePage בחוזה (openapi.yaml). המנהל רואה רק את ההזמנות של המוסד שלו.
router.get(
  '/invites',
  authorize('A07', 'read'),
  asyncHandler(async (req, res) => {
    const { page, size, status } = listInvitesQuerySchema.parse(req.query);
    const now = new Date();
    const filter: InviteFilter = {
      institutionId: req.user!.institutionId,
      ...statusFilter(status, now),
    };
    const [items, total] = await Promise.all([
      Invite.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * size)
        .limit(size)
        .lean(),
      Invite.countDocuments(filter),
    ]);
    const mapped = items.map((inv) => ({
      id: String(inv._id),
      email: inv.email,
      role: inv.role,
      classIds: (inv.classIds ?? []).map(String),
      studentIds: (inv.studentIds ?? []).map(String),
      message: inv.message,
      status: effectiveStatus(inv, now),
      invitedBy: String(inv.invitedBy),
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    }));
    res.json(toPage(mapped, total, page, size));
  }),
);

export default router;
