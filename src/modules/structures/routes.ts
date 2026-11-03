import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import { asyncHandler } from '../../utils/asyncHandler';
import { GradeLevel } from './model';

const router = Router();

router.get(
  '/grade-levels',
  authorize('I01', 'read'),
  asyncHandler(async (req, res) => {
    const items = await GradeLevel.find({ institutionId: req.user!.institutionId }).sort({ order: 1 }).lean();
    res.json({ items: items.map((item) => ({
      id: String(item._id),
      name: item.name,
      order: item.order,
      classCount: item.classCount,
    })) });
  }),
);

export default router;
