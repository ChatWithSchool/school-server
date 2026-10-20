import { Schema, model, type InferSchemaType } from 'mongoose';
import { ROLE_KEYS } from '../permissions';

const userSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    roles: { type: [String], enum: ROLE_KEYS, default: [] },
    status: { type: String, enum: ['active', 'disabled', 'invited'], default: 'active' },
    lastLoginAt: { type: Date },
    failedLogins: { type: Number, default: 0 },
    lockedUntil: { type: Date },
  },
  { timestamps: true, collection: 'users' },
);
userSchema.index({ institutionId: 1, email: 1 }, { unique: true });

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);
