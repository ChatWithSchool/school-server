import { z } from 'zod';
import { DATE_ONLY } from '../../utils/dateOnly';

/** The body of POST /lessons/{id}/substitute. Used from sprint 3. */
export const createSubstitutionSchema = z.object({
  date: z.string().regex(DATE_ONLY, 'התאריך צריך להיות בפורמט YYYY-MM-DD'),
  substituteTeacherId: z.string().min(1, 'חובה לבחור ממלא מקום'),
});

export type CreateSubstitution = z.infer<typeof createSubstitutionSchema>;