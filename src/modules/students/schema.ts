import { z } from 'zod';

export const createStudentSchema = z.object({
  name: z.string().trim().min(2, 'חובה שם (לפחות 2 תווים)').max(80),
});
export const updateStudentSchema = createStudentSchema.partial();

export type CreateStudent = z.infer<typeof createStudentSchema>;
