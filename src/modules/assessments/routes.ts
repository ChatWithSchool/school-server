import { Router } from 'express';
import { Assessment, Grade } from '../../models';
import { authorize } from '../../middleware/authorize';
import { getScopedClassIds } from '../../services/scope';
import { asyncHandler } from '../../utils/asyncHandler';
import { parsePagination, toPage } from '../../utils/pagination';

const router = Router();

/**
 * GET /api/assessments?page=1&size=25 (G04): the assessments, newest first, as AssessmentPage.
 * Management (full) sees the whole institution. A teacher (scoped) sees only her own assessments,
 * in her own classes. gradedCount = how many grades were entered (score not null).
 * POST /assessments (writing) is server B (sprint 3).
 */
router.get(
  '/assessments',
  authorize('G04', 'read'),
  asyncHandler(async (req, res) => {
    const { page, size, skip } = parsePagination(req.query);
    const filter: Record<string, unknown> = { institutionId: req.user!.institutionId };
    if (req.accessLevel === 'scoped') {
      filter.classId = { $in: await getScopedClassIds(req.user!.id) };
      filter.teacherId = req.user!.id;
    }
    const [items, total] = await Promise.all([
      // date descending puts the assessments without a date (null) last
      Assessment.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(size).lean(),
      Assessment.countDocuments(filter),
    ]);

    // one query for the graded count of every assessment on the page
    const counts = await Grade.aggregate<{ _id: unknown; n: number }>([
      { $match: { assessmentId: { $in: items.map((a) => a._id) }, score: { $ne: null } } },
      { $group: { _id: '$assessmentId', n: { $sum: 1 } } },
    ]);
    const graded = new Map(counts.map((c) => [String(c._id), c.n]));

    const mapped = items.map((a) => ({
      id: String(a._id),
      title: a.title,
      type: a.type,
      classId: String(a.classId),
      groupId: a.groupId ? String(a.groupId) : null,
      subjectId: String(a.subjectId),
      teacherId: String(a.teacherId),
      termId: a.termId ? String(a.termId) : null,
      date: a.date ?? null,
      ...(a.weight === undefined || a.weight === null ? {} : { weight: a.weight }),
      gradedCount: graded.get(String(a._id)) ?? 0,
    }));
    res.json(toPage(mapped, total, page, size));
  }),
);

export default router;
