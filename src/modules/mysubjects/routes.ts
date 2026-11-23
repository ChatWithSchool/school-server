import { Router } from 'express';
import { AcademicYear, Assessment, Grade, TeachingAssignment } from '../../models';
import { authorize } from '../../middleware/authorize';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

/**
 * GET /api/me/teaching (G08): one card per class and subject the signed-in teacher teaches in
 * the active year, with how many assessments still have a missing grade and how many students
 * are missing one. TeachingCardList in the contract: { items }, no paging.
 */
router.get(
  '/me/teaching',
  authorize('G08', 'read'),
  asyncHandler(async (req, res) => {
    const institutionId = req.user!.institutionId;
    const year = await AcademicYear.findOne({ institutionId, status: 'active' }).lean();
    if (!year) {
      res.json({ items: [] });
      return;
    }
    // "me": always the teacher's own assignments, whatever the access level
    const assignments = await TeachingAssignment.find({
      institutionId,
      yearId: year._id,
      teacherId: req.user!.id,
    })
      .sort({ classId: 1, subjectId: 1 })
      .lean();
    if (!assignments.length) {
      res.json({ items: [] });
      return;
    }

    const assessments = await Assessment.find({
      institutionId,
      $or: assignments.map((t) => ({ classId: t.classId, subjectId: t.subjectId })),
    })
      .select('classId subjectId')
      .lean();
    // one query for all the missing grades (score null = not entered yet)
    const missing = await Grade.find({
      institutionId,
      assessmentId: { $in: assessments.map((a) => a._id) },
      score: null,
    })
      .select('assessmentId studentId')
      .lean();

    const items = assignments.map((t) => {
      const ids = new Set(
        assessments
          .filter(
            (a) =>
              String(a.classId) === String(t.classId) &&
              String(a.subjectId) === String(t.subjectId),
          )
          .map((a) => String(a._id)),
      );
      const mine = missing.filter((g) => ids.has(String(g.assessmentId)));
      return {
        classId: String(t.classId),
        subjectId: String(t.subjectId),
        openAssessments: new Set(mine.map((g) => String(g.assessmentId))).size,
        studentsWithoutGrade: new Set(mine.map((g) => String(g.studentId))).size,
      };
    });
    res.json({ items });
  }),
);

export default router;
