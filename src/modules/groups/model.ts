import { Schema, model, type InferSchemaType } from 'mongoose';

const groupSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    yearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['study', 'special'], default: 'study' },
    gradeLevel: { type: String, default: null },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', default: null },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'groups' },
);
groupSchema.index({ institutionId: 1, yearId: 1, name: 1 }, { unique: true });

const groupMemberSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  },
  { timestamps: true, collection: 'group_members' },
);
groupMemberSchema.index({ groupId: 1, studentId: 1 }, { unique: true });
groupMemberSchema.index({ studentId: 1 });

export type GroupDoc = InferSchemaType<typeof groupSchema>;
export type GroupMemberDoc = InferSchemaType<typeof groupMemberSchema>;
export const Group = model('Group', groupSchema);
export const GroupMember = model('GroupMember', groupMemberSchema);
