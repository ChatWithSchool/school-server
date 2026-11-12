import { Institution, Lesson, User } from '../../models';
import { LessonSubstitution } from './model';

/** Idempotent: upserts by institution + lesson + date, so running the seed again never duplicates. */
export async function seed(): Promise<void> {
  const inst = await Institution.findOne({ name: 'בית ספר לדוגמה' });
  if (!inst) return;
  const author = await User.findOne({ institutionId: inst._id, roles: 'management' });
  if (!author) return;

  const lessons = await Lesson.find({ institutionId: inst._id })
    .sort({ dayOfWeek: 1, period: 1 })
    .limit(2);
  if (lessons.length === 0) {
    console.log('lesson-substitutions: no lessons yet, skipping');
    return;
  }

  const teachers = await User.find({ institutionId: inst._id, roles: 'teacher' }).sort({ email: 1 });

  // Fixed dates, so every run produces the same data.
  const dates = ['2026-10-27', '2026-10-28'];

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    const absent = lesson.teacherId;
    const substitute = teachers.find((t) => String(t._id) !== String(absent));
    if (!substitute) continue;
    await LessonSubstitution.updateOne(
      { institutionId: inst._id, lessonId: lesson._id, date: dates[i] },
      {
        $setOnInsert: {
          absentTeacherId: absent,
          substituteTeacherId: substitute._id,
          assignedBy: author._id,
        },
      },
      { upsert: true },
    );
  }
}