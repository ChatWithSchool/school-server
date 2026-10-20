import { Schema, model, type InferSchemaType } from 'mongoose';

const academicYearSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
  },
  { timestamps: true, collection: 'academic_years' },
);
academicYearSchema.index({ institutionId: 1, name: 1 }, { unique: true });

export type AcademicYearDoc = InferSchemaType<typeof academicYearSchema>;
export const AcademicYear = model('AcademicYear', academicYearSchema);
