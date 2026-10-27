import { Assessment, Grade, GradeFeedback, TeachingAssignment } from '../../models';
import type { SeedContext } from './context';

// each class and subject gets the same three assessments; the weights add up to 100
const PLAN: {
  title: string;
  type: 'exam' | 'quiz' | 'assignment';
  weight: number;
  daysAgo: number;
}[] = [
  { title: 'בוחן פתיחה', type: 'quiz', weight: 20, daysAgo: 35 },
  { title: 'מטלה', type: 'assignment', weight: 30, daysAgo: 21 },
  { title: 'מבחן', type: 'exam', weight: 50, daysAgo: 7 },
];
const FEEDBACK = [
  'עבודה יסודית ומסודרת.',
  'כדאי לחזור על החומר של השבוע האחרון.',
  'שיפור יפה מהבוחן הקודם.',
];

/** Score of student `s` in assessment `a`: 55-100, and now and then not entered yet (null). */
export const scoreFor = (s: number, a: number): number | null =>
  (s + a) % 11 === 0 ? null : 55 + ((s * 37 + a * 13) % 46);

export async function seedGrades(ctx: SeedContext): Promise<void> {
  const assignments = await TeachingAssignment.find({
    institutionId: ctx.instId,
    yearId: ctx.yearId,
  }).sort({
    classId: 1,
    subjectId: 1,
  });
  let a = 0;
  for (const ta of assignments) {
    const className = ctx.classNames.get(String(ta.classId));
    if (!className) continue;
    for (const p of PLAN) {
      const assessment = await Assessment.findOneAndUpdate(
        { institutionId: ctx.instId, classId: ta.classId, subjectId: ta.subjectId, title: p.title },
        {
          $set: {
            yearId: ctx.yearId,
            teacherId: ta.teacherId,
            type: p.type,
            weight: p.weight,
            date: ctx.dayOffset(-p.daysAgo),
          },
        },
        { upsert: true, new: true },
      );
      const students = ctx.studentsByClass[className] ?? [];
      // one round trip per assessment instead of one per student
      await Grade.bulkWrite(
        students.map((studentId, s) => ({
          updateOne: {
            filter: { assessmentId: assessment._id, studentId },
            update: {
              $set: { institutionId: ctx.instId, score: scoreFor(s, a), updatedBy: ta.teacherId },
            },
            upsert: true,
          },
        })),
      );
      const grades = await Grade.find({ assessmentId: assessment._id });
      const gradeOf = new Map(grades.map((g) => [String(g.studentId), g._id]));
      const feedback = students.flatMap((studentId, s) =>
        scoreFor(s, a) !== null && (s + a) % 13 === 1
          ? [
              {
                updateOne: {
                  filter: { gradeId: gradeOf.get(String(studentId)) },
                  update: {
                    $set: {
                      institutionId: ctx.instId,
                      studentId,
                      authorId: ta.teacherId,
                      text: FEEDBACK[(s + a) % FEEDBACK.length],
                    },
                  },
                  upsert: true,
                },
              },
            ]
          : [],
      );
      if (feedback.length) await GradeFeedback.bulkWrite(feedback);
      a++;
    }
  }
}
