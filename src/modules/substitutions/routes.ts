import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import { Lesson, StaffProfile, User } from '../../models';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { LessonSubstitution } from './model';

const router = Router();

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PERIOD = 10;
const LAST_SCHOOL_DAY = 5; // 0 = Sunday ... 5 = Friday (same as the Lesson model)

/** Reads date and slot from the query. Throws 400 when one is missing or invalid. */
function parseAvailabilityQuery(query: Record<string, unknown>) {
  const { date, slot } = query;

  if (typeof date !== 'string' || !DATE_FORMAT.test(date)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'יש לשלוח תאריך בפורמט YYYY-MM-DD');
  }
  const day = new Date(`${date}T00:00:00Z`);
  // rejects dates that do not exist, such as 2026-02-31
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== date) {
    throw new AppError(400, 'VALIDATION_ERROR', 'התאריך שנשלח אינו תקין');
  }

  const period = typeof slot === 'string' ? Number(slot) : NaN;
  if (!Number.isInteger(period) || period < 1 || period > MAX_PERIOD) {
    throw new AppError(400, 'VALIDATION_ERROR', 'יש לשלוח מספר שיעור בין 1 ל-10');
  }

  // getUTCDay: 0 = Sunday, the same numbering as Lesson.dayOfWeek
  return { date, period, dayOfWeek: day.getUTCDay() };
}

// GET /api/staff/available?date=2026-10-18&slot=1  (T03 · ממלא מקום ומורים זמינים)
// The response matches the AvailableTeacherList schema in the contract (openapi.yaml): { items } without paging.
router.get(
  '/staff/available',
  authorize('T03', 'read'),
  asyncHandler(async (req, res) => {
    const institutionId = req.user!.institutionId;
    const { date, period, dayOfWeek } = parseAvailabilityQuery(req.query);

    // There are no lessons on Saturday, so nobody is "available" in a meaningful way.
    if (dayOfWeek > LAST_SCHOOL_DAY) {
      res.json({ items: [] });
      return;
    }

    const [dayLessons, daySubstitutions, profiles] = await Promise.all([
      Lesson.find({ institutionId, dayOfWeek }).select('teacherId period').lean(),
      LessonSubstitution.find({ institutionId, date })
        .select('lessonId substituteTeacherId')
        .lean(),
      StaffProfile.find({ institutionId }).select('userId subjectIds').lean(),
    ]);

    // Who is busy in this slot, and how many lessons each teacher has that day.
    const busy = new Set<string>();
    const lessonsCount = new Map<string, number>();
    const periodOfLesson = new Map<string, number>();
    for (const lesson of dayLessons) {
      const teacher = String(lesson.teacherId);
      lessonsCount.set(teacher, (lessonsCount.get(teacher) ?? 0) + 1);
      periodOfLesson.set(String(lesson._id), lesson.period);
      if (lesson.period === period) busy.add(teacher);
    }

    // A teacher who already substitutes in this slot on this date is busy too.
    for (const substitution of daySubstitutions) {
      if (periodOfLesson.get(String(substitution.lessonId)) === period) {
        busy.add(String(substitution.substituteTeacherId));
      }
    }

    const subjectsByUser = new Map<string, string[]>(
      profiles.map(
        (p) => [String(p.userId), (p.subjectIds ?? []).map(String)] as [string, string[]],
      ),
    );

    // Active teachers of this institution, found through their staff profile.
    const teachers = await User.find({
      _id: { $in: profiles.map((p) => p.userId) },
      institutionId,
      roles: 'teacher',
      status: 'active',
    })
      .select('firstName lastName')
      .lean();

    const items = teachers
      .filter((u) => !busy.has(String(u._id)))
      .sort(
        (a, b) =>
          a.lastName.localeCompare(b.lastName, 'he') ||
          a.firstName.localeCompare(b.firstName, 'he') ||
          String(a._id).localeCompare(String(b._id)),
      )
      .map((u) => ({
        teacherId: String(u._id),
        firstName: u.firstName,
        lastName: u.lastName,
        subjectIds: subjectsByUser.get(String(u._id)) ?? [],
        lessonsThatDay: lessonsCount.get(String(u._id)) ?? 0,
      }));

    res.json({ items });
  }),
);

export default router;
