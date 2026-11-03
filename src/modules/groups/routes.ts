import { Router } from 'express';
import { Types } from 'mongoose';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { parsePagination, toPage } from '../../utils/pagination';
import { Group } from './model';
import { createGroupSchema, updateGroupSchema } from './schema';

const router = Router();

// GET /api/groups?page=1&size=25
router.get(
  '/groups',
  authorize('S04', 'read'),
  asyncHandler(async (req, res) => {
    const { page, size, skip } = parsePagination(req.query);
    const filter = { institutionId: req.user!.institutionId };
    const [items, total] = await Promise.all([
      Group.find(filter).sort({ name: 1 }).skip(skip).limit(size).lean(),
      Group.countDocuments(filter),
    ]);
    res.json(toPage(items.map((i) => ({ id: String(i._id), name: i.name })), total, page, size));
  }),
);

// POST /api/groups
router.post(
  '/groups',
  authorize('S04', 'write'),
  validateBody(createGroupSchema),
  asyncHandler(async (req, res) => {
    const created = await Group.create({ ...req.body, institutionId: req.user!.institutionId });
    res.status(201).json({ id: String(created._id) });
  }),
);

// PUT /api/groups/:id
router.put(
  '/groups/:id',
  authorize('S04', 'write'),
  validateBody(updateGroupSchema),
  asyncHandler(async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id)) throw new AppError(400, 'BAD_ID', 'מזהה לא תקין');
    const updated = await Group.findOneAndUpdate(
      { _id: req.params.id, institutionId: req.user!.institutionId },
      { $set: req.body },
      { new: true },
    );
    if (!updated) throw new AppError(404, 'NOT_FOUND', 'הרשומה לא נמצאה');
    res.status(204).end();
  }),
);

// DELETE /api/groups/:id
router.delete(
  '/groups/:id',
  authorize('S04', 'write'),
  asyncHandler(async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id)) throw new AppError(400, 'BAD_ID', 'מזהה לא תקין');
    const removed = await Group.findOneAndDelete({ _id: req.params.id, institutionId: req.user!.institutionId });
    if (!removed) throw new AppError(404, 'NOT_FOUND', 'הרשומה לא נמצאה');
    res.status(204).end();
  }),
);

export default router;
