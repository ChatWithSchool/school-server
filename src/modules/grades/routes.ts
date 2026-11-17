import { Router } from 'express';
import { Types } from 'mongoose';
import { Grade } from '../../models/grade.model';
import { authorize } from '../../middleware/authorize';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// GET /api/students/:id/grades
router.get(
  '/students/:id/grades',
  authorize('G02', 'read'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'BAD_ID', 'מזהה לא תקין');

    const grades = await Grade.find({
      studentId: id,
      institutionId: req.user!.institutionId,
    }).lean();

    res.json({ items: grades });
  }),
);

export default router;