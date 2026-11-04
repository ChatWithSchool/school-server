import mongoose from 'mongoose';
import { Institution, StaffProfile, User } from '../../models';
import { LessonSubstitution } from './schema';

/**
 * Idempotent: upserts by institution + lesson + date, so running the seed again never duplicates.
 * The core "lessons" collection does not exist yet, so we read it directly and skip if it is empty.
 */
export async function seed(): Promise<void> {
  const inst = await Institution.findOne({ name: 'בית ספר לדוגמה' });
  if (!inst) return;
  const author = await User.findOne({ institutionId: inst._id, roles: 'management' });
  if (!author) return;

  const lesson = await mongoose.connection
    .collection('lessons')
    .findOne({ institutionId: inst._id });
  if (!lesson) {
    console.log('lesson-substitutions: no lessons yet, skipping');
    return;
  }

  const substitute = await StaffProfile.findOne({ institutionId: inst._id });
  if (!substitute) return;

  // Fixed date so that running the seed again never creates a new row
  const date = new Date('2026-10-28T00:00:00.000Z');

  await LessonSubstitution.updateOne(
    { institutionId: inst._id, lessonId: lesson._id, date },
    { $setOnInsert: { substituteTeacherId: substitute._id, createdBy: author._id } },
    { upsert: true },
  );
}