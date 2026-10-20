import { Schema, model, type InferSchemaType } from 'mongoose';

const institutionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['elementary', 'middle', 'high', 'mixed'], default: 'mixed' },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    activeYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear' },
  },
  { timestamps: true, collection: 'institutions' },
);

export type InstitutionDoc = InferSchemaType<typeof institutionSchema>;
export const Institution = model('Institution', institutionSchema);
