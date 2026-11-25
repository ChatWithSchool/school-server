import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import { asyncHandler } from '../../utils/asyncHandler';
import { Student } from '../../models';

const router = Router();

// GET /api/students/check-duplicate?nationalId=...
router.get(
  '/students/check-duplicate',
  authorize('S02', 'read'),
  asyncHandler(async (req, res) => {
    const nationalId =
      typeof req.query.nationalId === 'string' ? req.query.nationalId.trim() : '';

    if (!nationalId) {
      res.json({ duplicate: false, studentId: null });
      return;
    }

    const existing = await Student.findOne({
      institutionId: req.user!.institutionId,
      nationalId,
    })
      .select('_id')
      .lean();

    if (!existing) {
      res.json({ duplicate: false, studentId: null });
      return;
    }

    res.json({
      duplicate: true,
      studentId: String(existing._id),
    });
  }),
);

export default router;