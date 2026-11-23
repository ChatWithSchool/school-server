import { Router } from 'express';
import type { FilterQuery } from 'mongoose';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import { Subject } from '../../models';
import type { SubjectDoc } from '../../models/subject.model';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { parsePagination, toPage } from '../../utils/pagination';
import { createSubjectSchema, type CreateSubject } from './schema';

const router = Router();

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000 &&
    'keyPattern' in error &&
    typeof error.keyPattern === 'object' &&
    error.keyPattern !== null &&
    'code' in error.keyPattern
  );
}

function validationError(field: string, message: string): AppError {
  return new AppError(400, 'VALIDATION_ERROR', 'הנתונים שנשלחו אינם תקינים', [
    { field, message },
  ]);
}

router.get(
  '/subjects',
  authorize('I06', 'read'),
  asyncHandler(async (req, res) => {
    const { page, size, skip } = parsePagination(req.query);
    const filter: FilterQuery<SubjectDoc> = { institutionId: req.user!.institutionId };

    const [subjects, total] = await Promise.all([
      Subject.find(filter).sort({ name: 1, code: 1 }).skip(skip).limit(size).lean(),
      Subject.countDocuments(filter),
    ]);

    res.json(
      toPage(
        subjects.map((subject) => ({
          id: String(subject._id),
          name: subject.name,
          code: subject.code,
          grades: subject.grades,
        })),
        total,
        page,
        size,
      ),
    );
  }),
);

router.post(
  '/subjects',
  authorize('I06', 'write'),
  validateBody(createSubjectSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as CreateSubject;
    const institutionId = req.user!.institutionId;
    const code = input.code.toUpperCase();
    const duplicateCode = await Subject.exists({ institutionId, code });
    if (duplicateCode) throw validationError('code', 'הקוד כבר קיים במוסד');

    const duplicateName = await Subject.exists({
      institutionId,
      name: input.name,
    }).collation({ locale: 'he', strength: 2 });
    if (duplicateName) throw validationError('name', 'המקצוע כבר קיים במוסד');

    let created;
    try {
      created = await Subject.create({ ...input, code, institutionId });
    } catch (error) {
      if (isDuplicateKeyError(error)) throw validationError('code', 'הקוד כבר קיים במוסד');
      throw error;
    }

    res.status(201).json({ id: String(created._id) });
  }),
);

export default router;
