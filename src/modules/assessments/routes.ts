import { Router } from 'express';
import { Types } from 'mongoose';
import { Assessment } from '../../models/assessment.model';
import { Grade } from '../../models/grade.model';
import { authorize } from '../../middleware/authorize';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get(
  '/:id/stats',
  authorize('G05', 'read'),
  asyncHandler(async (req, res) => {
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

    const totalSubmissions = grades.length;
    let averageScore = 0;
    let highestScore = 0;
    let lowestScore = 0;

    if (totalSubmissions > 0) {
      const scores = grades.map((g: any) => g.score ?? 0);
      const sum = scores.reduce((acc, score) => acc + score, 0);
      
      averageScore = Number((sum / totalSubmissions).toFixed(2));
      highestScore = Math.max(...scores);
      lowestScore = Math.min(...scores);
    }

    res.json({
      assessmentId: id,
      title: (assessment as any).title,
      totalSubmissions,
      averageScore,
      highestScore,
      lowestScore,
    });
  }),
);

export default router;