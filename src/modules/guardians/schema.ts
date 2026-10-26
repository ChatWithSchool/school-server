import { z } from 'zod';

// ולידציה של בקשת קישור הורה (POST /students/:id/guardians)
export const linkGuardianSchema = z.object({
  email: z.string().trim().toLowerCase().email('אימייל לא תקין'),
  relation: z.string().trim().max(40).optional(),
  visibility: z
    .object({
      attendance: z.boolean().default(true),
      grades: z.boolean().default(true),
      notes: z.boolean().default(true),
    })
    .default({}),
});

export type LinkGuardian = z.infer<typeof linkGuardianSchema>;