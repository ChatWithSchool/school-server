import { Schema, model, type InferSchemaType } from 'mongoose';

const gradeFeedbackSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    gradeId: { type: Schema.Types.ObjectId, ref: 'Grade', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    text: { type: String, required: true, trim: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'grade_feedback' },
);

export type GradeFeedbackDoc = InferSchemaType<typeof gradeFeedbackSchema>;
export const GradeFeedback = model('GradeFeedback', gradeFeedbackSchema);
