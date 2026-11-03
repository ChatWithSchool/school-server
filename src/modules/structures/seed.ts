import { AcademicYear, Institution } from '../../models';
import { GradeLevel } from './model';

export async function seed(): Promise<void> {
  const inst = await Institution.findOne({ name: 'בית ספר לדוגמה' });
  if (!inst) return;

  const year = await AcademicYear.findOne({ institutionId: inst._id, status: 'active' });
  if (!year) return;

  const items = [
    { name: 'א', order: 1, classCount: 2 },
    { name: 'ב', order: 2, classCount: 2 },
    { name: 'ג', order: 3, classCount: 2 },
    { name: 'ד', order: 4, classCount: 2 },
    { name: 'ה', order: 5, classCount: 2 },
    { name: 'ו', order: 6, classCount: 2 },
    { name: 'ז', order: 7, classCount: 2 },
    { name: 'ח', order: 8, classCount: 2 },
    { name: 'ט', order: 9, classCount: 2 },
  ];

  for (const level of items) {
    await GradeLevel.updateOne(
      { institutionId: inst._id, yearId: year._id, name: level.name },
      {
        $set: {
          institutionId: inst._id,
          yearId: year._id,
          order: level.order,
          classCount: level.classCount,
        },
      },
      { upsert: true },
    );
  }
}
