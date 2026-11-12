import { Institution, Lesson, User } from '../../models';
import { addDays, toDateOnly, weekday } from '../../utils/dateOnly';
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

  // active teachers only
  const teachers = await User.find({
    institutionId: inst._id,
    roles: 'teacher',
    status: 'active',
  }).sort({ email: 1 });

  // the date of each lesson's weekday, in the current school week (Sunday to Thursday)
  const today = toDateOnly(new Date());
  const weekStart = addDays(today, -weekday(today));

  for (const lesson of lessons) {
    // a substitute must be free in that slot
    const busy = new Set(
      (
        await Lesson.distinct('teacherId', {
          institutionId: inst._id,
          dayOfWeek: lesson.dayOfWeek,
          period: lesson.period,
        })
      ).map(String),
    );
    const substitute = teachers.find((t) => !busy.has(String(t._id)));
    if (!substitute) continue;
    await LessonSubstitution.updateOne(
      {
        institutionId: inst._id,
        lessonId: lesson._id,
        date: addDays(weekStart, lesson.dayOfWeek),
      },
      {
        $setOnInsert: {
          absentTeacherId: lesson.teacherId,
          substituteTeacherId: substitute._id,
          assignedBy: author._id,
        },
      },
      { upsert: true },
    );
  }
}