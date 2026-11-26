import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { Assessment, Grade } from '../../models';
import { authorize } from '../../middleware/authorize';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { parsePagination, toPage } from '../../utils/pagination';
import { getScopedClassIds } from '../../services/scope';

const router = Router();

const MIN_REPRESENTATIVE = 5;

const round2 = (n: number) => Number(n.toFixed(2));

function calculateMedian(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? round2((sorted[mid - 1] + sorted[mid]) / 2)
    : round2(sorted[mid]);
}

function summarize(rawScores: Array<number | null | undefined>) {
  const scores = rawScores.filter((s): s is number => typeof s === 'number');
  const count = scores.length;
  if (count === 0) {
    return { count, average: null, median: null, stdDev: null, representative: false };
  }
  const sorted = [...scores].sort((a, b) => a - b);
  const avg = scores.reduce((a, b) => a + b, 0) / count;
  const variance = scores.reduce((a, s) => a + (s - avg) ** 2, 0) / count;
  return {
    count,
    average: round2(avg),
    median: calculateMedian(sorted),
    stdDev: round2(Math.sqrt(variance)),
    representative: count >= MIN_REPRESENTATIVE,
  };
}

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

// GET /api/assessments/:id/stats
router.get(
  '/assessments/:id/stats',
  authorize('G05', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(400, 'BAD_ID', 'מזהה מבחן לא תקין');
    }
    const institutionId = req.user!.institutionId;

    const assessment = await Assessment.findOne({ _id: id, institutionId }).lean();
    if (!assessment) {
      throw new AppError(404, 'ASSESSMENT_NOT_FOUND', 'המבחן לא נמצא');
    }

    if (req.accessLevel === 'scoped') {
      const scopedClassIds = (await getScopedClassIds(req.user!.id)).map(String);
      if (!scopedClassIds.includes(String(assessment.classId))) {
        throw new AppError(403, 'FORBIDDEN', 'אין הרשאה למבחן זה');
      }
    }

    const grades = await Grade.find({ assessmentId: id, institutionId }).lean();

    res.json({
      assessmentId: id,
      ...summarize(grades.map((g) => g.score)),
    });
  }),
);

// GET /api/stats/compare?assessmentId=&subjectId=&classIds=&termId=
router.get(
  '/stats/compare',
  authorize('G05', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { assessmentId, subjectId, classIds, termId } = req.query;
    const institutionId = req.user!.institutionId;

    const idParams = { assessmentId, subjectId, termId };
    for (const [name, value] of Object.entries(idParams)) {
      if (value !== undefined && (typeof value !== 'string' || !Types.ObjectId.isValid(value))) {
        throw new AppError(400, 'BAD_ID', `פרמטר ${name} לא תקין`);
      }
    }

    let requestedClassIds: string[] | undefined;
    if (classIds !== undefined) {
      if (typeof classIds !== 'string') {
        throw new AppError(400, 'INVALID_QUERY', 'classIds לא תקין');
      }
      requestedClassIds = classIds.split(',').map((c) => c.trim());
      if (!requestedClassIds.every((c) => Types.ObjectId.isValid(c))) {
        throw new AppError(400, 'BAD_ID', 'מזהה כיתה לא תקין');
      }
    }

    if (req.accessLevel === 'scoped') {
      const scopedClassIds = (await getScopedClassIds(req.user!.id)).map(String);
      if (requestedClassIds) {
        if (!requestedClassIds.every((c) => scopedClassIds.includes(c))) {
          throw new AppError(403, 'FORBIDDEN', 'אין הרשאה לאחת הכיתות');
        }
      } else {
        requestedClassIds = scopedClassIds;
      }
    }

    if (requestedClassIds && requestedClassIds.length === 0) {
      res.json({ items: [] });
      return;
    }

    // שלב 1: המבחנים שעונים על הסינון (classId, subjectId, termId נמצאים ב-Assessment)
    const assessmentFilter: Record<string, unknown> = { institutionId };
    if (assessmentId) assessmentFilter._id = assessmentId;
    if (subjectId) assessmentFilter.subjectId = subjectId;
    if (termId) assessmentFilter.termId = termId;
    if (requestedClassIds) assessmentFilter.classId = { $in: requestedClassIds };

    const assessments = await Assessment.find(assessmentFilter).select('_id classId').lean();
    const classByAssessment = new Map(assessments.map((a) => [String(a._id), String(a.classId)]));

    // שלב 2: כל הציונים של אותם מבחנים, בשאילתה אחת
    const grades = await Grade.find({
      institutionId,
      assessmentId: { $in: assessments.map((a) => a._id) },
    }).lean();

    // שלב 3: קיבוץ לפי הכיתה של המבחן
    const byClass = new Map<string, Array<number | null | undefined>>();
    for (const g of grades) {
      const classId = classByAssessment.get(String(g.assessmentId));
      if (!classId) continue;
      if (!byClass.has(classId)) byClass.set(classId, []);
      byClass.get(classId)!.push(g.score);
    }

    const items = [...byClass.entries()].map(([classId, scores]) => {
      const s = summarize(scores);
      return {
        classId,
        average: s.average,
        median: s.median,
        studentCount: s.count,
        representative: s.representative,
      };
    });

    res.json({ items });
  }),
);

export default router;
