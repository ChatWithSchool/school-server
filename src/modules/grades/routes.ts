import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { Grade } from '../../models/grade.model';
import { authorize } from '../../middleware/authorize';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// GET /api/grades
router.get(
  '/',
  authorize('G02', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const institutionId = req.user!.institutionId;
    const { term, studentId } = req.query;

    const filter: Record<string, unknown> = { institutionId };

    if (term) {
      filter.term = term;
    }

    if (studentId) {
      if (!Types.ObjectId.isValid(studentId as string)) {
        throw new AppError(400, 'BAD_ID', 'מזהה תלמיד לא תקין');
      }
      filter.studentId = studentId;
    }

    // אם המשתמש הוא תלמיד, נגביל אותו אך ורק לציונים של עצמו
    if (req.accessLevel === 'scoped' && req.user!.roles.includes('student')) {
      filter.studentId = req.user!.id;
    }

    const grades = await Grade.find(filter)
      .select('-__v')
      .lean();

    const validGrades = grades.filter(
      (g: { score?: number | null }) => g.score !== null && g.score !== undefined
    );

    res.json({ grades: validGrades });
  })
);

// GET /api/grades/:id
router.get(
  '/:id',
  authorize('G02', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(400, 'BAD_ID', 'מזהה ציון לא תקין');
    }

    const institutionId = req.user!.institutionId;

    const grade = await Grade.findOne({
      _id: id,
      institutionId,
    })
      .select('-__v')
      .lean();

    if (!grade) {
      throw new AppError(404, 'GRADE_NOT_FOUND', 'הציון לא נמצא');
    }

    res.json({ grade });
  })
);

export default router;