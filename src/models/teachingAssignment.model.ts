import { Schema, model, type InferSchemaType } from 'mongoose';

const teachingAssignmentSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    yearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true, collection: 'teaching_assignments' },
);
teachingAssignmentSchema.index(
  { yearId: 1, classId: 1, subjectId: 1, teacherId: 1 },
  { unique: true },
);

export type TeachingAssignmentDoc = InferSchemaType<typeof teachingAssignmentSchema>;
export const TeachingAssignment = model('TeachingAssignment', teachingAssignmentSchema);
