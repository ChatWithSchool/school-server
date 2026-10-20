import { Router } from 'express';
import { Types } from 'mongoose';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { parsePagination, toPage } from '../../utils/pagination';
import { Announcement } from './model';
import { createAnnouncementSchema, type CreateAnnouncement } from './schema';

/**
 * REFERENCE MODULE (training example, screen I10 was deferred from version 1).
 * It shows the whole pattern: authorization by the permission matrix, validation, pagination,
 * a uniform error format, institution scoping and tests. Copy it with `npm run new:module`.
 */
const router = Router();

// GET /api/announcements?page=1&size=25
router.get(
  '/announcements',
  authorize('I10', 'read'),
  asyncHandler(async (req, res) => {
    const { page, size, skip } = parsePagination(req.query);
    const filter = { institutionId: req.user!.institutionId };
    const [items, total] = await Promise.all([
      Announcement.find(filter).sort({ pinned: -1, createdAt: -1 }).skip(skip).limit(size).lean(),
      Announcement.countDocuments(filter),
    ]);
    const userId = req.user!.id;
    const mapped = items.map((a) => ({
      id: String(a._id),
      title: a.title,
      body: a.body,
      audience: a.audience,
      pinned: a.pinned,
      createdAt: a.createdAt,
      read: a.readBy.some((u) => String(u) === userId),
    }));
    res.json(toPage(mapped, total, page, size));
  }),
);

// POST /api/announcements
router.post(
  '/announcements',
  authorize('I10', 'write'),
  validateBody(createAnnouncementSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as CreateAnnouncement;
    const created = await Announcement.create({
      ...body,
      institutionId: req.user!.institutionId,
      createdBy: req.user!.id,
    });
    res.status(201).json({ id: String(created._id) });
  }),
);

// POST /api/announcements/:id/read
router.post(
  '/announcements/:id/read',
  authorize('I10', 'read'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'BAD_ID', 'מזהה לא תקין');
    const updated = await Announcement.findOneAndUpdate(
      { _id: id, institutionId: req.user!.institutionId },
      { $addToSet: { readBy: req.user!.id } },
      { new: true },
    );
    if (!updated) throw new AppError(404, 'NOT_FOUND', 'ההודעה לא נמצאה');
    res.status(204).end();
  }),
);

export default router;
