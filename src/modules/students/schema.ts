import { z } from 'zod';

export const createStudentsSchema = z.object({
  name: z.string().trim().min(2, 'חובה שם (לפחות 2 תווים)').max(80),
});
export const updateStudentsSchema = createStudentsSchema.partial();

export type CreateStudents = z.infer<typeof createStudentsSchema>;
