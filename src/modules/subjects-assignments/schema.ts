import { z } from 'zod';

export const createSubjectSchema = z.object({
  name: z.string().trim().min(2, 'שם המקצוע חייב להכיל לפחות 2 תווים').max(80),
  code: z.string().trim().min(2, 'קוד המקצוע חייב להכיל לפחות 2 תווים').max(12),
  grades: z.array(z.string().trim().min(1)).default([]),
});

export type CreateSubject = z.infer<typeof createSubjectSchema>;
