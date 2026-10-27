import { Schema, model, type InferSchemaType } from 'mongoose';

// מחזור הערכה (מחצית, מגמה) בתוך שנת לימודים.
const termSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true, index: true },
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['planned', 'active', 'closed'], default: 'planned' },
  },
  { timestamps: true, collection: 'terms' },
);
termSchema.index({ institutionId: 1, academicYearId: 1, name: 1 }, { unique: true });

export type TermDoc = InferSchemaType<typeof termSchema>;
export const Term = model('Term', termSchema);