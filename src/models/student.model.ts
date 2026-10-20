import { Schema, model, type InferSchemaType } from 'mongoose';

const guardianSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    relation: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false },
);

const studentSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    nationalId: { type: String, required: true, trim: true },
    birthDate: { type: Date },
    classId: { type: Schema.Types.ObjectId, ref: 'SchoolClass', index: true },
    guardians: { type: [guardianSchema], default: [] },
    address: { type: String, trim: true },
    notes: { type: String, trim: true },
    tags: { type: [String], default: [] },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    /** Soft delete: the record stays for history. */
    deletedAt: { type: Date },
  },
  { timestamps: true, collection: 'students' },
);
studentSchema.index({ institutionId: 1, nationalId: 1 }, { unique: true });

export type StudentDoc = InferSchemaType<typeof studentSchema>;
export const Student = model('Student', studentSchema);
