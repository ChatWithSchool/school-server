import { Schema, model, type InferSchemaType } from 'mongoose';
import { DATE_ONLY } from '../utils/dateOnly';

const assessmentSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    yearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    termId: { type: Schema.Types.ObjectId, ref: 'Term', default: null },
    classId: { type: Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', default: null },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ['exam', 'quiz', 'assignment'], required: true },
    date: { type: String, match: DATE_ONLY, default: null },
    /** Percent of the final grade (G06 checks that a term adds up to 100). */
    weight: { type: Number, min: 0, max: 100 },
  },
  { timestamps: true, collection: 'assessments' },
);
assessmentSchema.index({ classId: 1, subjectId: 1, date: 1 });

export type AssessmentDoc = InferSchemaType<typeof assessmentSchema>;
export const Assessment = model('Assessment', assessmentSchema);
