import { Router } from 'express';
import { AcademicYear, Institution, Lesson, Room, SchoolClass, Subject, User } from '../../models';
import { authorize } from '../../middleware/authorize';
import { asyncHandler } from '../../utils/asyncHandler';
import { toCsv } from './csv';

const router = Router();

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];

router.get(
  '/schedule/template',
  authorize('T04', 'read'),
  asyncHandler(async (req, res) => {
    const institutionId = req.user!.institutionId;
    const institution = await Institution.findById(institutionId).select('activeYearId').lean();
    const activeYear =
      institution?.activeYearId ??
      (await AcademicYear.findOne({ institutionId, status: 'active' }).select('_id').lean())?._id;
    const lessons = activeYear
      ? await Lesson.find({ institutionId, yearId: activeYear })
          .sort({ dayOfWeek: 1, period: 1 })
          .lean()
      : [];

    const ids = (values: unknown[]) => [...new Set(values.map(String))];
    const classIds = ids(lessons.map((lesson) => lesson.classId));
    const subjectIds = ids(lessons.map((lesson) => lesson.subjectId));
    const teacherIds = ids(lessons.map((lesson) => lesson.teacherId));
    const roomIds = ids(lessons.flatMap((lesson) => (lesson.roomId ? [lesson.roomId] : [])));

    const [classes, subjects, teachers, rooms] = await Promise.all([
      SchoolClass.find({ institutionId, _id: { $in: classIds } }).select('_id name').lean(),
      Subject.find({ institutionId, _id: { $in: subjectIds } }).select('_id name').lean(),
      User.find({ institutionId, _id: { $in: teacherIds } })
        .select('_id firstName lastName')
        .lean(),
      Room.find({ institutionId, _id: { $in: roomIds } }).select('_id name').lean(),
    ]);

    const className = new Map(classes.map((item) => [String(item._id), item.name]));
    const subjectName = new Map(subjects.map((item) => [String(item._id), item.name]));
    const teacherName = new Map(
      teachers.map((item) => [
        String(item._id),
        `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim(),
      ]),
    );
    const roomName = new Map(rooms.map((item) => [String(item._id), item.name]));

    const rows = lessons.map((lesson) => [
      DAYS[lesson.dayOfWeek] ?? lesson.dayOfWeek,
      lesson.period,
      className.get(String(lesson.classId)),
      subjectName.get(String(lesson.subjectId)),
      teacherName.get(String(lesson.teacherId)),
      lesson.roomId ? roomName.get(String(lesson.roomId)) : '',
    ]);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="schedule.csv"');
    res.send(toCsv(['יום', 'שעה', 'כיתה', 'מקצוע', 'מורה', 'חדר'], rows));
  }),
);

export default router;
