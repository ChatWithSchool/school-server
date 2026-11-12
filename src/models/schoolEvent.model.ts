import { Schema, model, type InferSchemaType } from 'mongoose';
import { DATE_ONLY } from '../utils/dateOnly';

const schoolEventSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    yearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ['holiday', 'event', 'parents_day', 'vacation'], required: true },
    startDate: { type: String, required: true, match: DATE_ONLY },
    endDate: { type: String, required: true, match: DATE_ONLY },
    /** Empty = the whole institution. */
    gradeLevels: { type: [String], default: [] },
  },
  { timestamps: true, collection: 'events' },
);
schoolEventSchema.index({ institutionId: 1, startDate: 1 });

export type SchoolEventDoc = InferSchemaType<typeof schoolEventSchema>;
export const SchoolEvent = model('SchoolEvent', schoolEventSchema);
