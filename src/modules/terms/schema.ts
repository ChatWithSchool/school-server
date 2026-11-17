import { z } from 'zod';

// ולידציה של POST /terms. בדיקת חפיפה בין מחזורים דורשת את מסד הנתונים, והיא תיכתב בספרינט 3.
export const createTermSchema = z
  .object({
    name: z.string().trim().min(2, 'חובה שם (לפחות 2 תווים)').max(60),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((t) => t.endDate > t.startDate, {
    message: 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה',
    path: ['endDate'],
  });

export type CreateTerm = z.infer<typeof createTermSchema>;