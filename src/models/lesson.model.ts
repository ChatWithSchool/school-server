import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * One weekly lesson slot. Clashes (a teacher, class or room in two places) are checked by the
 * server when saving (T02), not by a unique index: a cross-class group needs several lessons
 * in the same slot.
 */
const lessonSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    yearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', default: null },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', default: null },
    /** 0 = Sunday ... 5 = Friday */
    dayOfWeek: { type: Number, required: true, min: 0, max: 5 },
    period: { type: Number, required: true, min: 1, max: 10 },
  },
  { timestamps: true, collection: 'lessons' },
);
lessonSchema.index({ classId: 1, dayOfWeek: 1, period: 1 });
lessonSchema.index({ teacherId: 1, dayOfWeek: 1, period: 1 });
lessonSchema.index({ roomId: 1, dayOfWeek: 1, period: 1 });

export type LessonDoc = InferSchemaType<typeof lessonSchema>;
export const Lesson = model('Lesson', lessonSchema);
