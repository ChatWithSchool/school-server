import { Institution, User } from '../../models';
import { Announcement } from './model';

/** Idempotent: upserts by title, so running the seed again never duplicates. */
export async function seed(): Promise<void> {
  const inst = await Institution.findOne({ name: 'בית ספר לדוגמה' });
  if (!inst) return;
  const author = await User.findOne({ institutionId: inst._id, roles: 'management' });
  if (!author) return;
  const items = [
    {
      title: 'ברוכים הבאים לשנת הלימודים',
      body: 'נשמח לפגוש את כולם בישיבת הצוות הראשונה.',
      pinned: true,
    },
    { title: 'עדכון מערכת שעות', body: 'מערכת השעות החדשה תפורסם בתחילת השבוע.', pinned: false },
  ];
  for (const a of items) {
    await Announcement.updateOne(
      { institutionId: inst._id, title: a.title },
      { $setOnInsert: { ...a, institutionId: inst._id, audience: 'staff', createdBy: author._id } },
      { upsert: true },
    );
  }
}
