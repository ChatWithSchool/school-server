import { Router } from 'express';
import { Assessment } from '../../models/assessment.model'; 

const router = Router();


router.get('/:id/stats', async (req, res) => {
  try {
    const assessmentId = req.params.id;
    const assessment = await Assessment.findById(assessmentId);

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    
    res.json(assessment);
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch assessment statistics' });
  }
});

export default router;