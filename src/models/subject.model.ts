import { Schema, model, type InferSchemaType } from 'mongoose';

const subjectSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    grades: { type: [String], default: [] },
  },
  { timestamps: true, collection: 'subjects' },
);
subjectSchema.index({ institutionId: 1, code: 1 }, { unique: true });

export type SubjectDoc = InferSchemaType<typeof subjectSchema>;
export const Subject = model('Subject', subjectSchema);
