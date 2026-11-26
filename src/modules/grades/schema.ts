import { z } from 'zod';

export const createGradeSchema = z.object({
  name: z.string().trim().min(2, 'חובה שם (לפחות 2 תווים)').max(80),
});
export const updateGradeSchema = createGradeSchema.partial();

export type CreateGrade = z.infer<typeof createGradeSchema>;
