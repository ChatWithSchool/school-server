import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import { Lesson, SchoolEvent, StaffProfile, User } from '../../models';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { toDateOnly, weekday } from '../../utils/dateOnly';
import { LessonSubstitution } from './model';

/**
 * Routes of the substitutions module. It is shared by T06 (my day) and T03 (substitute teacher):
 * each screen adds its own routes here and imports the model from './model'.
 */
const router = Router();

// ---------------------------------------------------------------------------
// T06 · my day
// ---------------------------------------------------------------------------

// GET /api/me/today  ->  MyDay (see openapi.yaml). No query parameters, no pagination.
router.get(
  '/me/today',
  authorize('T06', 'read'), // 401 / 403 come from the permission matrix
  asyncHandler(async (req, res) => {
    const institutionId = req.user!.institutionId;
    const me = req.user!.id; // the User _id: it is the same value as Lesson.teacherId
    const date = toDateOnly(new Date()); // today in Israel, 'YYYY-MM-DD'

    // A school-wide day off (holiday or vacation that applies to every grade) shows a message, not an empty list.
    const dayOff = await SchoolEvent.findOne({
      institutionId,
      type: { $in: ['holiday', 'vacation'] },
      startDate: { $lte: date },
      endDate: { $gte: date },
      gradeLevels: { $size: 0 },
    }).lean();
    if (dayOff) {
      res.json({ date, isDayOff: true, dayOffTitle: dayOff.title, lessons: [] });
      return;
    }

    // today's substitutions (one lesson has at most one substitute per day)
    const subs = await LessonSubstitution.find({ institutionId, date }).lean();
    const replacedAway = new Set(
      subs.filter((s) => String(s.absentTeacherId) === me).map((s) => String(s.lessonId)),
    );
    const covering = new Set(
      subs.filter((s) => String(s.substituteTeacherId) === me).map((s) => String(s.lessonId)),
    );

    // my own lessons today, plus lessons I cover today
    const lessons = await Lesson.find({
      institutionId,
      $or: [{ teacherId: me, dayOfWeek: weekday(date) }, { _id: { $in: [...covering] } }],
    })
      .sort({ period: 1 })
      .lean();

    const mapped = lessons
      .filter((l) => !replacedAway.has(String(l._id))) // someone else teaches it today
      .map((l) => ({
        lessonId: String(l._id),
        period: l.period,
        classId: String(l.classId),
        subjectId: String(l.subjectId),
        roomId: l.roomId ? String(l.roomId) : null,
        substituteTeacherId: covering.has(String(l._id)) ? me : null,
        // TODO: no source for a changed room in the schemas yet. Waiting for the team lead.
        roomChanged: false,
      }));

    res.json({ date, isDayOff: false, dayOffTitle: null, lessons: mapped });
  }),
);

// ---------------------------------------------------------------------------
// T03 · substitute teacher and available teachers
// ---------------------------------------------------------------------------

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

// GET /api/staff/available?date=2026-10-18&slot=1
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