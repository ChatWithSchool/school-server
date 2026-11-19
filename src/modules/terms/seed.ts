import { AcademicYear, Institution } from '../../models';
import { toDateOnly } from '../../utils/dateOnly';
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
    { name: 'מחצית א', startDate: toDateOnly(new Date(start)), endDate: toDateOnly(new Date(mid)), status: 'open' },
    { name: 'מחצית ב', startDate: toDateOnly(new Date(mid + DAY)), endDate: toDateOnly(new Date(end)), status: 'open' },
  ];
  for (const t of terms) {
    await Term.updateOne(
      { yearId: year._id, name: t.name },
      { $set: { ...t, institutionId: inst._id, yearId: year._id } },
      { upsert: true },
    );
  }
}