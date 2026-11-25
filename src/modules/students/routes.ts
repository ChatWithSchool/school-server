import { Router } from 'express';
import { Types } from 'mongoose';
import { authorize } from '../../middleware/authorize';
import { asyncHandler } from '../../utils/asyncHandler';
import { parsePagination, toPage } from '../../utils/pagination';
import { Student } from '../../models';
import { getScopedClassIds } from '../../services/scope';

const router = Router();

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[-־–—]/g, '')
    .trim();
}

// GET /api/students?q=&class=&status=&page=1&size=25
router.get(
  '/students',
  authorize('S01', 'read'),
  asyncHandler(async (req, res) => {
    const { page, size, skip } = parsePagination(req.query);

    const filter: Record<string, unknown> = {
      institutionId: req.user!.institutionId,
      deletedAt: null,
    };

const classParam = typeof req.query.class === 'string' ? req.query.class.trim() : '';

const allowedClassIds =
  req.accessLevel === 'scoped'
    ? (await getScopedClassIds(req.user!.id)).map(String)
    : null;

if (classParam) {
  // מורה ביקשה כיתה שאינה שלה: תוצאה ריקה
  if (allowedClassIds && !allowedClassIds.includes(classParam)) {
    res.json(toPage([], 0, page, size));
    return;
  }
  filter.classId = Types.ObjectId.isValid(classParam)
    ? new Types.ObjectId(classParam)
    : classParam;
} else if (allowedClassIds) {
  filter.classId = { $in: allowedClassIds };
}

    const statusParam = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    if (statusParam === 'active' || statusParam === 'inactive') {
      filter.status = statusParam;
    }

    const qParam = typeof req.query.q === 'string' ? normalizeSearchText(req.query.q) : '';
    if (qParam) {
      const pattern = new RegExp(escapeRegex(qParam), 'i');
      filter.$or = [
        { firstName: pattern },
        { lastName: pattern },
        { nationalId: pattern },
      ];
    }

    const [items, total] = await Promise.all([
      Student.find(filter)
        .sort({ lastName: 1, firstName: 1 })
        .skip(skip)
        .limit(size)
        .lean(),
      Student.countDocuments(filter),
    ]);

    const mapped = items.map((s) => {
      const primaryGuardian = Array.isArray(s.guardians) && s.guardians.length > 0
        ? s.guardians[0]
        : null;

      return {
        id: String(s._id),
        firstName: s.firstName,
        lastName: s.lastName,
        nationalId: s.nationalId,
        classId: s.classId ? String(s.classId) : null,
        primaryGuardianName: primaryGuardian?.name ?? null,
        status: s.status,
      };
    });

    res.json(toPage(mapped, total, page, size));
  }),
);

export default router;