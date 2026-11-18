import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { Assessment } from '../../models/assessment.model';
import { Grade } from '../../models/grade.model';
import { authorize } from '../../middleware/authorize';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// פונקציית עזר לחישוב חציון
function calculateMedian(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sorted = [...scores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
  }
  return Number(sorted[mid].toFixed(2));
}

// GET /api/assessments/:id/stats
router.get(
  '/:id/stats',
  authorize('G05', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(400, 'BAD_ID', 'מזהה מבחן לא תקין');
    }

    const institutionId = req.user!.institutionId;

    const assessment = await Assessment.findOne({
      _id: id,
      institutionId,
    }).lean();

    if (!assessment) {
      throw new AppError(404, 'ASSESSMENT_NOT_FOUND', 'המבחן לא נמצא');
    }

    const grades = await Grade.find({
      assessmentId: id,
      institutionId,
    }).lean();

    // הגדרת טיפוס מפורש לציונים במקום any
    const validGrades = grades.filter(
      (g: { score?: number | null }) => g.score !== null && g.score !== undefined
    );
    const totalSubmissions = validGrades.length;

    let averageScore = 0;
    let medianScore = 0;
    let highestScore = 0;
    let lowestScore = 0;

    if (totalSubmissions > 0) {
      const scores = validGrades.map((g) => g.score as number);
      const sum = scores.reduce((acc, score) => acc + score, 0);

      averageScore = Number((sum / totalSubmissions).toFixed(2));
      medianScore = calculateMedian(scores);
      highestScore = Math.max(...scores);
      lowestScore = Math.min(...scores);
    }

    res.json({
      assessmentId: id,
      title: assessment.title,
      totalSubmissions,
      averageScore,
      medianScore,
      highestScore,
      lowestScore,
    });
  }),
);

// GET /api/assessments/stats/compare
router.get(
  '/stats/compare',
  authorize('G05', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { assessmentIds } = req.query;
    const institutionId = req.user!.institutionId;

    if (!assessmentIds || typeof assessmentIds !== 'string') {
      throw new AppError(400, 'INVALID_QUERY', 'יש לספק מזהי מבחנים להשוואה');
    }

    const ids = assessmentIds.split(',').map((id) => id.trim());
    const validIds = ids.filter((id) => Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      throw new AppError(400, 'INVALID_IDS', 'לא נמצאו מזהי מבחנים תקינים');
    }

    const comparisons = [];

    for (const assessmentId of validIds) {
      const assessment = await Assessment.findOne({
        _id: assessmentId,
        institutionId,
      }).lean();

      if (!assessment) continue;

      const grades = await Grade.find({
        assessmentId,
        institutionId,
      }).lean();

      const validGrades = grades.filter(
        (g: { score?: number | null }) => g.score !== null && g.score !== undefined
      );
      const totalSubmissions = validGrades.length;

      let averageScore = 0;
      let medianScore = 0;

      if (totalSubmissions > 0) {
        const scores = validGrades.map((g) => g.score as number);
        const sum = scores.reduce((acc, score) => acc + score, 0);
        averageScore = Number((sum / totalSubmissions).toFixed(2));
        medianScore = calculateMedian(scores);
      }

      comparisons.push({
        assessmentId,
        title: assessment.title,
        totalSubmissions,
        averageScore,
        medianScore,
      });
    }

    res.json({ comparisons });
  }),
);

export default router;