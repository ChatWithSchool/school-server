import { Schema, model, type InferSchemaType } from 'mongoose';
import { DATE_ONLY } from '../utils/dateOnly';

const attendanceRecordSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    date: { type: String, required: true, match: DATE_ONLY },
    /** null = daily attendance; a number = that lesson period. */
    period: { type: Number, min: 1, max: 10, default: null },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    status: { type: String, enum: ['present', 'absent', 'late'], required: true },
    markedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** Set when a past day is changed (N01 records who edited it). */
    editedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'attendance_records' },
);
attendanceRecordSchema.index({ studentId: 1, date: 1, period: 1 }, { unique: true });
attendanceRecordSchema.index({ classId: 1, date: 1 });

export type AttendanceRecordDoc = InferSchemaType<typeof attendanceRecordSchema>;
export const AttendanceRecord = model('AttendanceRecord', attendanceRecordSchema);
