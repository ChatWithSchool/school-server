import { Router } from 'express';
import { Assessment } from '../../models/assessment.model'; // ודאי את שם המודל אצלך

const router = Router();

// GET /api/assessments/:id/stats - קבלת סטטיסטיקות עבור הערכה ספציפית
router.get('/:id/stats', async (req, res) => {
  try {
    const assessmentId = req.params.id;
    const assessment = await Assessment.findById(assessmentId);

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // החזרת הסטטיסטיקות או האובייקט
    res.json(assessment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assessment statistics' });
  }
});

export default router;