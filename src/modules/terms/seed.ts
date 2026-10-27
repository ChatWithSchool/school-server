import { AcademicYear, Institution } from '../../models';
import { Term } from './model';

const DAY = 24 * 60 * 60 * 1000;

/** Idempotent. שני מחזורים שלא חופפים, מחושבים מתוך תאריכי שנת הלימודים. */
export async function seed(): Promise<void> {
  const inst = await Institution.findOne({ name: 'בית ספר לדוגמה' });
  if (!inst) return;
  const year = await AcademicYear.findOne({ institutionId: inst._id, status: 'active' });
  if (!year) return;

  const start = year.startDate.getTime();
  const end = year.endDate.getTime();
  const mid = start + Math.floor((end - start) / 2);

  const terms = [
    { name: 'מחצית א', startDate: new Date(start), endDate: new Date(mid), status: 'active' },
    { name: 'מחצית ב', startDate: new Date(mid + DAY), endDate: new Date(end), status: 'planned' },
  ];
  for (const t of terms) {
    await Term.updateOne(
      { institutionId: inst._id, academicYearId: year._id, name: t.name },
      { $setOnInsert: { ...t, institutionId: inst._id, academicYearId: year._id } },
      { upsert: true },
    );
  }
}