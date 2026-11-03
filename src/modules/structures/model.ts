import { Schema, model, type InferSchemaType } from 'mongoose';

const gradeLevelSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    yearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    name: { type: String, required: true, trim: true },
    order: { type: Number, required: true },
    classCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'grade_levels' },
);

gradeLevelSchema.index({ institutionId: 1, yearId: 1, name: 1 }, { unique: true });

export type GradeLevelDoc = InferSchemaType<typeof gradeLevelSchema>;
export const GradeLevel = model('GradeLevel', gradeLevelSchema);
