import { Schema, model, type InferSchemaType } from 'mongoose';
import { DATE_ONLY } from '../../utils/dateOnly';

// מחזור הערכה (מחצית, מגמה) בתוך שנת לימודים.
const termSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    yearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    name: { type: String, required: true, trim: true },
    startDate: { type: String, required: true, match: DATE_ONLY },
    endDate: { type: String, required: true, match: DATE_ONLY },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
  },
  { timestamps: true, collection: 'terms' },
);
termSchema.index({ yearId: 1, name: 1 }, { unique: true });

export type TermDoc = InferSchemaType<typeof termSchema>;
export const Term = model('Term', termSchema);