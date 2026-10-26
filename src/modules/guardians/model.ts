import { Schema, model, type InferSchemaType } from 'mongoose';

// קישור בין הורה לתלמיד. רשומה אחת = הורה אחד מקושר לתלמיד אחד.
// הורה עם שני ילדים = שתי רשומות עם אותו אימייל (קריטריון הקבלה "בורר ילדים").
const guardianSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    relation: { type: String, trim: true }, // קרבה: אמא, אבא...
    phone: { type: String, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' }, // חשבון ההורה, אם כבר קיים
    // מה ההורה רואה (נוכחות, ציונים, הערות)
    visibility: {
      attendance: { type: Boolean, default: true },
      grades: { type: Boolean, default: true },
      notes: { type: Boolean, default: true },
    },
  },
  { timestamps: true, collection: 'student_guardians' },
);
// אותו הורה לא מקושר פעמיים לאותו תלמיד
guardianSchema.index({ studentId: 1, email: 1 }, { unique: true });

export type GuardianDoc = InferSchemaType<typeof guardianSchema>;
export const Guardian = model('Guardian', guardianSchema);