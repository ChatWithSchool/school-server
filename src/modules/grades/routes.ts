import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { Student } from '../../models/student.model';
import { Assessment } from '../../models/assessment.model';
import { Grade } from '../../models/grade.model';
import { GradeFeedback } from '../../models/gradeFeedback.model';
import { authorize } from '../../middleware/authorize';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { getScopedClassIds } from '../../services/scope';

const router = Router();

const round2 = (n: number) => Number(n.toFixed(2));

type GradeEntry = {
  gradeId: string;
  assessmentId: string;
  title: string;
  type: string;
  date: string | null;
  score: number;
  weight: number | null;
};

// הנחה: השוואת הציון האחרון לממוצע הקודמים. סף של 2 נקודות. לבדוק מול החוזה.
function calculateTrend(entries: GradeEntry[]): 'up' | 'down' | 'flat' {
  if (entries.length < 2) return 'flat';
  const last = entries[entries.length - 1].score;
  const previous = entries.slice(0, -1).map((e) => e.score);
  const prevAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
  const diff = last - prevAvg;
  if (diff > 2) return 'up';
  if (diff < -2) return 'down';
  return 'flat';
}

// GET /api/students/:id/grades?term=
router.get(
  '/students/:id/grades',
  authorize('G02', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const termId = req.query.term;

    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(400, 'BAD_ID', 'מזהה תלמיד לא תקין');
    }
    if (termId !== undefined && (typeof termId !== 'string' || !Types.ObjectId.isValid(termId))) {
      throw new AppError(400, 'BAD_ID', 'מזהה תקופה לא תקין');
    }

    const institutionId = req.user!.institutionId;

    const student = await Student.findOne({ _id: id, institutionId, deletedAt: null }).lean();
    if (!student) {
      throw new AppError(404, 'STUDENT_NOT_FOUND', 'התלמיד לא נמצא');
    }

    // הרשאות scoped: התלמיד עצמו, אפוטרופוס שלו, או כיתה שבטווח של המורה/המחנכת
    if (req.accessLevel === 'scoped') {
      const userId = req.user!.id;
      const isSelf = id === userId;
      const isGuardian = (student.guardians ?? []).some(
        (g) => g.userId && String(g.userId) === userId,
      );
      let inClassScope = false;
      if (!isSelf && !isGuardian && student.classId) {
        const scopedClassIds = (await getScopedClassIds(userId)).map(String);
        inClassScope = scopedClassIds.includes(String(student.classId));
      }
      if (!isSelf && !isGuardian && !inClassScope) {
        throw new AppError(403, 'FORBIDDEN', 'אין הרשאה לצפות בציוני תלמיד זה');
      }
    }

    // ציון ריק (null) מסוננים, לא מוחלפים ב-0
    const grades = await Grade.find({ institutionId, studentId: id }).lean();
    const graded = grades.filter((g) => typeof g.score === 'number');

    const assessmentFilter: Record<string, unknown> = {
      institutionId,
      _id: { $in: graded.map((g) => g.assessmentId) },
    };
    if (termId) assessmentFilter.termId = termId;
    const assessments = await Assessment.find(assessmentFilter).lean();
    const assessmentById = new Map(assessments.map((a) => [String(a._id), a]));

    const feedbackDocs = await GradeFeedback.find({
      institutionId,
      studentId: id,
      gradeId: { $in: graded.map((g) => g._id) },
    })
      .sort({ createdAt: 1 })
      .lean();

    // קיבוץ לפי מקצוע
    const bySubject = new Map<string, { entries: GradeEntry[]; gradeIds: Set<string> }>();
    for (const g of graded) {
      const a = assessmentById.get(String(g.assessmentId));
      if (!a) continue; // מבחן שלא עונה לסינון התקופה
      const key = String(a.subjectId);
      if (!bySubject.has(key)) bySubject.set(key, { entries: [], gradeIds: new Set() });
      const bucket = bySubject.get(key)!;
      bucket.gradeIds.add(String(g._id));
      bucket.entries.push({
        gradeId: String(g._id),
        assessmentId: String(a._id),
        title: a.title,
        type: a.type,
        date: a.date ?? null,
        score: g.score as number,
        weight: a.weight ?? null,
      });
    }

    const subjects = [...bySubject.entries()].map(([subjectId, { entries, gradeIds }]) => {
      entries.sort((x, y) => (x.date ?? '').localeCompare(y.date ?? ''));
      const average = round2(entries.reduce((s, e) => s + e.score, 0) / entries.length);
      return {
        subjectId,
        average,
        trend: calculateTrend(entries),
        grades: entries,
        feedback: feedbackDocs
          .filter((f) => gradeIds.has(String(f.gradeId)))
          .map((f) => ({ gradeId: String(f.gradeId), text: f.text, createdAt: f.createdAt })),
      };
    });

    res.json({ studentId: id, termId: termId ?? null, subjects });
  }),
);

export default router;