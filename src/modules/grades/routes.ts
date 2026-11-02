import { Router } from 'express';
import { Grade } from '../../models/grade.model';

const router = Router();

router.get('/:id/grades', async (req, res) => {
  try {
    const studentId = req.params.id;
    const grades = await Grade.find({ studentId });
    res.json(grades);
  } catch {
    res.status(500).json({ error: 'Failed to fetch student grades' });
  }
});

export default router;