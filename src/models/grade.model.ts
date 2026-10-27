import { Schema, model, type InferSchemaType } from 'mongoose';

const gradeSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    /** null = not entered yet, which is different from 0. */
    score: { type: Number, min: 0, max: 100, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'grades' },
);
gradeSchema.index({ assessmentId: 1, studentId: 1 }, { unique: true });

export type GradeDoc = InferSchemaType<typeof gradeSchema>;
export const Grade = model('Grade', gradeSchema);
