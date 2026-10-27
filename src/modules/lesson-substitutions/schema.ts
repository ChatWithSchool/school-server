import { Schema, model, type InferSchemaType } from 'mongoose';

const lessonSubstitutionSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    // ה-ref הוא טקסט בלבד, המודל Lesson ייווצר בידי הצוות שאחראי עליו
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    /** היום שבו ההחלפה חלה. שיבוץ חד-פעמי, לא משנה את המערכת הקבועה. */
    date: { type: Date, required: true },
    substituteTeacherId: { type: Schema.Types.ObjectId, ref: 'StaffProfile', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'lesson_substitutions' },
);
// שיבוץ אחד בלבד לכל שיעור ביום נתון
lessonSubstitutionSchema.index({ institutionId: 1, lessonId: 1, date: 1 }, { unique: true });

export type LessonSubstitutionDoc = InferSchemaType<typeof lessonSubstitutionSchema>;
export const LessonSubstitution = model('LessonSubstitution', lessonSubstitutionSchema);