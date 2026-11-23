import { Router } from 'express';
import { Types } from 'mongoose';
import { authorize } from '../../middleware/authorize';
import { Grade, Student } from '../../models';
import { getScopedClassIds } from '../../services/scope';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { GradeHistory } from './model';

const router = Router();

// GET /api/grades/:id/history
router.get(
  '/grades/:id/history',
  authorize('G03', 'read'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'מזהה ציון לא תקין');
    }

    const grade = await Grade.findOne({
      _id: id,
      institutionId: req.user!.institutionId,
    })
      .select('_id assessmentId studentId')
      .lean();

    if (!grade) {
      throw new AppError(404, 'NOT_FOUND', 'הציון לא נמצא');
    }

    if (req.accessLevel === 'scoped') {
      const [classIds, student] = await Promise.all([
        getScopedClassIds(req.user!.id),
        Student.findOne({
          _id: grade.studentId,
          institutionId: req.user!.institutionId,
        })
          .select('classId')
          .lean(),
      ]);

      const allowedClassIds = new Set(classIds.map((cId) => String(cId)));
      if (!student?.classId || !allowedClassIds.has(String(student.classId))) {
        throw new AppError(403, 'FORBIDDEN', 'אין הרשאה לצפות בהיסטוריה של ציון זה');
      }
    }

    const historyItems = await GradeHistory.find({
      gradeId: grade._id,
      institutionId: req.user!.institutionId,
    })
      .sort({ changedAt: -1, createdAt: -1 })
      .lean();

    const items = historyItems.map((entry) => ({
      id: String(entry._id),
      gradeId: String(entry.gradeId),
      studentId: String(entry.studentId),
      assessmentId: String(grade.assessmentId),
      changedBy: String(entry.changedBy),
      oldScore: entry.previousGrade ?? null,
      newScore: entry.newGrade ?? null,
      reason: entry.changeReason ?? null,
      createdAt: (entry.changedAt ?? entry.createdAt).toISOString(),
    }));

    res.json({ items });
  }),
);

export default router;