import { Schema, model, type InferSchemaType } from 'mongoose';
import { DATE_ONLY } from '../utils/dateOnly';

const attendanceAlertSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
    /** streak = absent several days in a row; monthly = too many absences this month */
    type: { type: String, enum: ['streak', 'monthly'], required: true },
    since: { type: String, required: true, match: DATE_ONLY },
    count: { type: Number, min: 0 },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    closeNote: { type: String, trim: true },
    closedAt: { type: Date },
  },
  { timestamps: true, collection: 'attendance_alerts' },
);
// the same case never opens two alerts
attendanceAlertSchema.index(
  { studentId: 1, type: 1 },
  { unique: true, partialFilterExpression: { status: 'open' } },
);

export type AttendanceAlertDoc = InferSchemaType<typeof attendanceAlertSchema>;
export const AttendanceAlert = model('AttendanceAlert', attendanceAlertSchema);
