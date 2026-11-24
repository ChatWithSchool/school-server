import { Institution, Lesson, StaffProfile, User } from '../../models';
import { LessonSubstitution } from './model';

// Fixed Sundays-to-Thursdays of one school week, so running the seed again never adds rows.
// dayOfWeek: 0 = Sunday ... 4 = Thursday
const WEEK = ['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22'];

/** How many covered lessons the demo data has. Every other lesson, and every other day, stays without a substitute. */
const COVERED = 3;

/** Idempotent: upserts by institution + lesson + date, so running the seed again never duplicates. */
export async function seed(): Promise<void> {
  const inst = await Institution.findOne({ name: 'בית ספר לדוגמה' });
  if (!inst) return;
  const author = await User.findOne({ institutionId: inst._id, roles: 'management' });
  if (!author) return;

  const lessons = await Lesson.find({ institutionId: inst._id }).sort({ dayOfWeek: 1, period: 1 });
  if (lessons.length === 0) {
    console.log('substitutions: no lessons yet, skipping');
    return;
  }

  // active teachers, found through their staff profile
  const profiles = await StaffProfile.find({ institutionId: inst._id }).populate('userId');
  const teacherIds = (
    await User.find({
      _id: { $in: profiles.map((p) => p.userId) },
      roles: 'teacher',
      status: 'active',
    }).sort({ email: 1 })
  ).map((u) => u._id);

  // a few lessons on different days, so the screen shows more than one case
  const picked = lessons
    .filter((_, i) => i % Math.floor(lessons.length / COVERED) === 0)
    .slice(0, COVERED);

  for (const lesson of picked) {
    // a substitute must have no lesson in that slot
    const busy = new Set(
      (
        await Lesson.distinct('teacherId', {
          institutionId: inst._id,
          dayOfWeek: lesson.dayOfWeek,
          period: lesson.period,
        })
      ).map(String),
    );
    const substituteId = teacherIds.find((id) => !busy.has(String(id)));
    // no free teacher in this slot: it stays without a substitute (the empty state of the screen)
    if (!substituteId) continue;
    await LessonSubstitution.updateOne(
      {
        institutionId: inst._id,
        lessonId: lesson._id,
        date: WEEK[lesson.dayOfWeek],
      },
      {
        $setOnInsert: {
          absentTeacherId: lesson.teacherId,
          substituteTeacherId: substituteId,
          assignedBy: author._id,
        },
      },
      { upsert: true },
    );
  }
}
