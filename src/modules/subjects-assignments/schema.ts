import { z } from 'zod';

export const createSubjectSchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().min(2).max(12).regex(/^[A-Za-z0-9_-]+$/),
  grades: z.array(z.string().trim().min(1).max(12)).min(1).max(12),
});

export type CreateSubject = z.infer<typeof createSubjectSchema>;

export const updateAssignmentSchema = z.object({
  subjectId: z.string().regex(/^[a-f\d]{24}$/i),
  teacherId: z.string().regex(/^[a-f\d]{24}$/i).nullable(),
});

export type UpdateAssignment = z.infer<typeof updateAssignmentSchema>;
