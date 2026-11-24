import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import { Lesson, SchoolEvent } from '../../models';
import { asyncHandler } from '../../utils/asyncHandler';
import { toDateOnly, weekday } from '../../utils/dateOnly';
import { LessonSubstitution } from './model';

/**
 * Routes of the substitutions module. It is shared by T06 (my day) and T03 (substitute teacher):
 * each screen adds its own routes here and imports the model from './model'.
 */
const router = Router();

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

export default router;