import { Institution, SchoolClass, Student, User } from '../../models';
import { StudentNote, type NoteKind } from './model';

type Template = {
  date: string;
  kind: NoteKind;
  severity: string;
  description: string;
  visibleToParent: boolean;
};

// the same three notes as in the design (S06): 16.10 positive, 14.10 discipline, 09.10 positive
const TEMPLATES: Template[] = [
  {
    date: '2026-10-16',
    kind: 'positive',
    severity: '',
    description: 'השתתף באופן פעיל בדיון הכיתתי.',
    visibleToParent: true,
  },
  {
    date: '2026-10-14',
    kind: 'discipline',
    severity: 'בינונית',
    description: 'אי-קיום כללי הכיתה במהלך השיעור.',
    visibleToParent: false,
  },
  {
    date: '2026-10-09',
    kind: 'positive',
    severity: '',
    description: 'עזר לחבר לכיתה שהתקשה בשיעור.',
    visibleToParent: true,
  },
];

/**
 * Demo data: the first three students of every class get the notes above, written by the
 * class homeroom teacher (or by management). Idempotent: upsert by student + date + description,
 * so running `npm run seed` again never creates duplicates.
 */
export async function seed(): Promise<void> {
  const inst = await Institution.findOne({ name: 'בית ספר לדוגמה' });
  if (!inst) return;
  const manager = await User.findOne({ institutionId: inst._id, roles: 'management' });
  if (!manager) return;

  const classes = await SchoolClass.find({ institutionId: inst._id });
  for (const cls of classes) {
    const students = await Student.find({ institutionId: inst._id, classId: cls._id })
      .sort({ nationalId: 1 })
      .limit(3);
    const authorId = cls.homeroomTeacherId ?? manager._id;
    for (const student of students) {
      for (const t of TEMPLATES) {
        const date = new Date(`${t.date}T00:00:00.000Z`);
        await StudentNote.updateOne(
          { institutionId: inst._id, studentId: student._id, date, description: t.description },
          {
            $setOnInsert: {
              institutionId: inst._id,
              studentId: student._id,
              date,
              kind: t.kind,
              severity: t.severity,
              description: t.description,
              visibleToParent: t.visibleToParent,
              authorId,
            },
          },
          { upsert: true },
        );
      }
    }
  }
}
