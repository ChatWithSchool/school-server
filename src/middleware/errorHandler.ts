import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';

/** One error format for the whole API: { error: { code, message, details? } }. */
export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'NOT_FOUND', 'הנתיב לא נמצא'));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'הנתונים שנשלחו אינם תקינים', details },
    });
    return;
  }
  if (err instanceof AppError) {
    res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  const e = err as { code?: number; message?: string };
  if (e && e.code === 11000) {
    res.status(409).json({ error: { code: 'DUPLICATE', message: 'הרשומה כבר קיימת' } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'אירעה שגיאה, נסי שוב' } });
}
