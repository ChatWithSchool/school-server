import { z } from 'zod';

export const gradeLevelSchema = z.object({
  institutionId: z.string().min(1),
  yearId: z.string().min(1),
  name: z.string().trim().min(1, 'שם השכבה חובה'),
  order: z.number().int().min(1),
  classCount: z.number().int().min(0).optional(),
});

export type GradeLevelInput = z.infer<typeof gradeLevelSchema>;
