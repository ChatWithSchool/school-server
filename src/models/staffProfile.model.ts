import { Schema, model, type InferSchemaType } from 'mongoose';

const staffProfileSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, trim: true },
    subjectIds: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
    /** Classes the person teaches or is the homeroom teacher of: used for scoped access. */
    classIds: [{ type: Schema.Types.ObjectId, ref: 'SchoolClass' }],
    startDate: { type: Date },
  },
  { timestamps: true, collection: 'staff_profiles' },
);
staffProfileSchema.index({ institutionId: 1, userId: 1 }, { unique: true });

export type StaffProfileDoc = InferSchemaType<typeof staffProfileSchema>;
export const StaffProfile = model('StaffProfile', staffProfileSchema);
