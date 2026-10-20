import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(25),
});

export type Page<T> = { items: T[]; total: number; page: number; size: number };

export function parsePagination(query: unknown): { page: number; size: number; skip: number } {
  const { page, size } = paginationSchema.parse(query);
  return { page, size, skip: (page - 1) * size };
}

export function toPage<T>(items: T[], total: number, page: number, size: number): Page<T> {
  return { items, total, page, size };
}
