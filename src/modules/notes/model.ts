import { Schema, model, type InferSchemaType } from 'mongoose';

export const NOTE_KINDS = ['positive', 'discipline', 'other'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

/**
 * S06 - behavior notes of a student. Collection owned by the screen: student_notes.
 * Reads: students (the student and its class) and users (the author).
 */
const studentNoteSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    /** The day of the event (stored at midnight UTC, sent to the client as yyyy-MM-dd). */
    date: { type: Date, required: true },
    kind: { type: String, enum: NOTE_KINDS, required: true },
    /** Free text, empty when the note has no severity (the client shows a dash). */
    severity: { type: String, trim: true, default: '' },
    description: { type: String, required: true, trim: true },
    /** v1-lite: stored, but controlling it per note is deferred. */
    visibleToParent: { type: Boolean, default: false },
    /** Every note carries its author (acceptance criterion). */
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** Soft delete with a reason (sprint 3, "server B"): the record stays for history. */
    deletedAt: { type: Date },
    deletedReason: { type: String, trim: true },
  },
  { timestamps: true, collection: 'student_notes' },
);
studentNoteSchema.index({ institutionId: 1, studentId: 1, date: -1 });

export type StudentNoteDoc = InferSchemaType<typeof studentNoteSchema>;
export const StudentNote = model('StudentNote', studentNoteSchema);
