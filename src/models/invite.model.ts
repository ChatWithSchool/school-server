import { Schema, model, type InferSchemaType } from 'mongoose';
import { ROLE_KEYS } from '../permissions';

const inviteSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    role: { type: String, enum: ROLE_KEYS, required: true },
    classIds: [{ type: Schema.Types.ObjectId, ref: 'SchoolClass' }],
    /** A parent invite is linked to children (A08). */
    studentIds: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
    message: { type: String, trim: true },
    /** Only the hash is stored. The token itself goes out in the link and is never returned. */
    tokenHash: { type: String, required: true, select: false },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'revoked', 'expired'],
      default: 'pending',
    },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },
  },
  { timestamps: true, collection: 'invites' },
);
inviteSchema.index({ tokenHash: 1 }, { unique: true });
// one pending invite per email
inviteSchema.index(
  { institutionId: 1, email: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } },
);

export type InviteDoc = InferSchemaType<typeof inviteSchema>;
export const Invite = model('Invite', inviteSchema);
