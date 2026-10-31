import { Schema, model, type InferSchemaType } from 'mongoose';

const gradeHistorySchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    gradeId: { type: Schema.Types.ObjectId, ref: 'Grade', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    previousGrade: { type: Number, required: true, min: 0, max: 100 },
    newGrade: { type: Number, required: true, min: 0, max: 100 },
    changeReason: { type: String, trim: true, maxlength: 500 },
    changedAt: { type: Date, required: true, default: Date.now },
  },
  { collection: 'grade_history' },
);

gradeHistorySchema.index({ institutionId: 1, studentId: 1, changedAt: -1 });
gradeHistorySchema.index({ institutionId: 1, gradeId: 1, changedAt: -1 });

export type GradeHistoryDoc = InferSchemaType<typeof gradeHistorySchema>;
export const GradeHistory = model('GradeHistory', gradeHistorySchema);
