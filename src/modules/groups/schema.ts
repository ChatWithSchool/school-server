import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().trim().min(2, 'חובה שם (לפחות 2 תווים)').max(80),
});
export const updateGroupSchema = createGroupSchema.partial();

export type CreateGroup = z.infer<typeof createGroupSchema>;
