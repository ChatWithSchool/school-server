import { Types } from 'mongoose';
import { GradeHistory, Institution, Student, User } from '../../models';

type SeedMode = 'empty' | 'few' | 'many';
type GradeReference = { _id: Types.ObjectId; studentId: Types.ObjectId };

const DEMO_INSTITUTION = 'בית ספר לדוגמה';
const SEED_ID_PREFIX = '67a00300000000';
const RECORD_COUNTS: Record<SeedMode, number> = { empty: 0, few: 3, many: 25 };
const REASONS = ['תיקון ניקוד', 'בדיקה חוזרת', 'השלמת סעיף'] as const;

function getMode(): SeedMode {
  const mode = process.env.G03_SEED_MODE ?? 'many';
  if (mode === 'empty' || mode === 'few' || mode === 'many') return mode;
  throw new Error(`ערך G03_SEED_MODE לא תקין: ${mode}. יש לבחור empty, few או many.`);
}

function seedId(index: number): Types.ObjectId {
  return new Types.ObjectId(`${SEED_ID_PREFIX}${index.toString(16).padStart(10, '0')}`);
}

/** Creates deterministic history rows using existing core users, students, and grades. */
export async function seed(): Promise<void> {
  const mode = getMode();
  const recordCount = RECORD_COUNTS[mode];
  const institution = await Institution.findOne({ name: DEMO_INSTITUTION }).select('_id').lean();
  if (!institution) {
    throw new Error('נתוני G03 דורשים את מוסד הדוגמה. יש להריץ seedCore() לפני seed המודולים.');
  }

  const seededIds = Array.from({ length: RECORD_COUNTS.many }, (_, index) =>
    seedId(index + 1),
  );

  if (recordCount === 0) {
    await GradeHistory.deleteMany({ institutionId: institution._id, _id: { $in: seededIds } });
    return;
  }

  const neededGrades = Math.ceil(recordCount / 4);
  const grades = await Institution.db!.collection<GradeReference>('grades')
    .find({ institutionId: institution._id })
    .project({ _id: 1, studentId: 1 })
    .sort({ _id: 1 })
    .limit(neededGrades)
    .toArray();
  if (grades.length < neededGrades) {
    throw new Error(
      `מצב G03 "${mode}" דורש לפחות ${neededGrades} ציונים קיימים באוסף grades של מוסד הדוגמה; נמצאו ${grades.length}. יש להריץ תחילה seed של מודול הציונים.`,
    );
  }

  const studentIds = [...new Set(grades.map((grade) => String(grade.studentId)))].map(
    (id) => new Types.ObjectId(id),
  );
  const students = await Student.find({
    _id: { $in: studentIds },
    institutionId: institution._id,
  })
    .select('_id')
    .lean();
  if (students.length !== studentIds.length) {
    throw new Error('אחד או יותר מהציונים שנבחרו אינם משויכים לתלמיד במוסד הדוגמה.');
  }

  const teacher = await User.findOne({
    institutionId: institution._id,
    roles: 'teacher',
    status: 'active',
  })
    .sort({ _id: 1 })
    .select('_id')
    .lean();
  if (!teacher) throw new Error('לא נמצא מורה פעיל במוסד הדוגמה עבור seed של G03.');

  await GradeHistory.deleteMany({
    institutionId: institution._id,
    _id: { $in: seededIds.slice(recordCount) },
  });

  for (let index = 0; index < recordCount; index++) {
    const grade = grades[Math.floor(index / 4)];
    const previousGrade = 60 + ((index * 7) % 35);
    await GradeHistory.updateOne(
      { _id: seedId(index + 1), institutionId: institution._id },
      {
        $set: {
          gradeId: grade._id,
          studentId: grade.studentId,
          changedBy: teacher._id,
          previousGrade,
          newGrade: Math.min(100, previousGrade + 5 + (index % 8)),
          changeReason: REASONS[index % REASONS.length],
          changedAt: new Date(Date.UTC(2025, 0, index + 1)),
        },
      },
      { upsert: true },
    );
  }
}