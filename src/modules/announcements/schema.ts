import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(2, 'חובה כותרת (לפחות 2 תווים)').max(120, 'הכותרת ארוכה מדי'),
  body: z.string().trim().min(1, 'חובה תוכן').max(5000, 'התוכן ארוך מדי'),
  audience: z.enum(['all', 'staff']).default('staff'),
  pinned: z.boolean().default(false),
});

export type CreateAnnouncement = z.infer<typeof createAnnouncementSchema>;
