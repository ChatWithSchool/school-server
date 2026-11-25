import { z } from 'zod';
import { paginationSchema } from '../../utils/pagination';
import { NOTE_KINDS } from './model';

/** yyyy-MM-dd that is a real calendar day. */
const dayString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'התאריך צריך להיות בפורמט שנה-חודש-יום')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00.000Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'התאריך אינו תקין');

/** Today in Israel as yyyy-MM-dd (the server may run in another time zone). */
export const todayInIsrael = (): string =>
  new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' });

/** POST /students/{id}/notes */
export const createNoteSchema = z.object({
  kind: z.enum(NOTE_KINDS, { errorMap: () => ({ message: 'יש לבחור סוג הערה' }) }),
  severity: z.string().trim().max(40, 'החומרה ארוכה מדי').default(''),
  description: z
    .string({ required_error: 'חובה תיאור' })
    .trim()
    .min(1, 'חובה תיאור')
    .max(2000, 'התיאור ארוך מדי'),
  visibleToParent: z.boolean().default(false),
  /** Optional: the day of the event. Defaults to today. */
  date: dayString
    .optional()
    .refine((v) => !v || v <= todayInIsrael(), 'אי אפשר לתעד הערה בתאריך עתידי'),
});
export type CreateNote = z.infer<typeof createNoteSchema>;

/** GET /students/{id}/notes?page=1&size=25&kind=&from=&to=&visibleToParent=&sort=-date */
export const NOTE_SORTS = ['date', '-date', 'kind', '-kind'] as const;

export const listNotesQuerySchema = paginationSchema
  .extend({
    kind: z.enum(NOTE_KINDS, { errorMap: () => ({ message: 'סוג הערה לא מוכר' }) }).optional(),
    from: dayString.optional(),
    to: dayString.optional(),
    visibleToParent: z
      .enum(['true', 'false'], { errorMap: () => ({ message: 'הערך צריך להיות true או false' }) })
      .transform((v) => v === 'true')
      .optional(),
    sort: z
      .enum(NOTE_SORTS, { errorMap: () => ({ message: 'מיון לא נתמך' }) })
      .default('-date'),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: 'תאריך ההתחלה מאוחר מתאריך הסיום',
    path: ['from'],
  });
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;
