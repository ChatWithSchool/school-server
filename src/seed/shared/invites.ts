import crypto from 'node:crypto';
import type { Types } from 'mongoose';
import { Invite } from '../../models';
import type { RoleKey } from '../../permissions';
import type { SeedContext } from './context';

const DAY = 86_400_000;

/** Invites in every state A07 shows: three pending, one expired and one revoked. */
export async function seedInvites(ctx: SeedContext): Promise<void> {
  const manager = ctx.staffIds[0];
  const firstStudent = ctx.studentsByClass['ח1']?.[0];
  const invites: {
    email: string;
    role: RoleKey;
    status: 'pending' | 'expired' | 'revoked';
    expiresInDays: number;
    classIds?: Types.ObjectId[];
    studentIds?: Types.ObjectId[];
  }[] = [
    {
      email: 'invite1@school.example',
      role: 'teacher',
      status: 'pending',
      expiresInDays: 7,
      classIds: [ctx.classIds['ז1']],
    },
    { email: 'invite2@school.example', role: 'secretary', status: 'pending', expiresInDays: 5 },
    {
      email: 'invite3@school.example',
      role: 'parent',
      status: 'pending',
      expiresInDays: 3,
      studentIds: firstStudent ? [firstStudent] : [],
    },
    { email: 'invite4@school.example', role: 'teacher', status: 'expired', expiresInDays: -2 },
    { email: 'invite5@school.example', role: 'coordinator', status: 'revoked', expiresInDays: 4 },
  ];
  for (const inv of invites) {
    // A real invite token is always random: nobody can guess it from the code. Only its hash is
    // stored, and only when the invite is created, so running the seed again keeps the token.
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await Invite.updateOne(
      { institutionId: ctx.instId, email: inv.email },
      {
        $setOnInsert: { tokenHash },
        $set: {
          role: inv.role,
          status: inv.status,
          classIds: inv.classIds ?? [],
          studentIds: inv.studentIds ?? [],
          invitedBy: manager,
          expiresAt: new Date(ctx.now.getTime() + inv.expiresInDays * DAY),
        },
      },
      { upsert: true },
    );
  }
}
