import { Router } from 'express';
import { Types } from 'mongoose';
import { authorize } from '../../middleware/authorize';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { getScopedClassIds } from '../../services/scope';
import { Grade, Assessment } from '../../models';

const router = Router();

// GET /api/assessments/:id/grades
router.get(
  '/assessments/:id/grades',
  authorize('G01', 'read'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'BAD_ID', 'מזהה לא תקין');

    const institutionId = req.user!.institutionId;

    // the assessment must exist in the user's institution
    const assessment = await Assessment.findOne({ _id: id, institutionId })
      .select('classId')
      .lean();
    if (!assessment) throw new AppError(404, 'NOT_FOUND', 'המבחן לא נמצא');

    // "scoped": a teacher sees only assessments of her own classes
    if (req.accessLevel === 'scoped') {
      const classIds = await getScopedClassIds(req.user!.id);
      const allowed = classIds.some((c) => String(c) === String(assessment.classId));
      if (!allowed) throw new AppError(404, 'NOT_FOUND', 'המבחן לא נמצא');
    }

    const grades = await Grade.find({ assessmentId: id, institutionId })
      .sort({ studentId: 1 })
      .lean();

    const items = grades.map((g) => ({
      id: String(g._id),
      assessmentId: String(g.assessmentId),
      studentId: String(g.studentId),
      score: g.score ?? null,
      updatedBy: String(g.updatedBy),
      updatedAt: g.updatedAt,
    }));

    res.json({ items });
  }),
);

export default router;