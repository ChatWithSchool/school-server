import { Schema, model, type InferSchemaType } from 'mongoose';
import { DATE_ONLY } from '../../utils/dateOnly';

const lessonSubstitutionSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    /** A one-time substitute for this day only: 'YYYY-MM-DD'. */
    date: { type: String, required: true, match: DATE_ONLY },
    absentTeacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    substituteTeacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'lesson_substitutions' },
);
// A lesson can have only one substitute on a given day.
lessonSubstitutionSchema.index({ institutionId: 1, lessonId: 1, date: 1 }, { unique: true });

export type LessonSubstitutionDoc = InferSchemaType<typeof lessonSubstitutionSchema>;
export const LessonSubstitution = model('LessonSubstitution', lessonSubstitutionSchema);
