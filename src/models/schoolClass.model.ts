import { Schema, model, type InferSchemaType } from 'mongoose';

const schoolClassSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    yearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    name: { type: String, required: true, trim: true },
    grade: { type: String, required: true, trim: true },
    homeroomTeacherId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'classes' },
);
schoolClassSchema.index({ institutionId: 1, yearId: 1, name: 1 }, { unique: true });

export type SchoolClassDoc = InferSchemaType<typeof schoolClassSchema>;
export const SchoolClass = model('SchoolClass', schoolClassSchema);
