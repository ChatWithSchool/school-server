import type { Request } from 'express';
import { Router } from 'express';
import { Types, type FilterQuery } from 'mongoose';
import { Student, User } from '../../models';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import { getScopedClassIds } from '../../services/scope';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { toPage } from '../../utils/pagination';
import { StudentNote, type StudentNoteDoc } from './model';
import {
  createNoteSchema,
  listNotesQuerySchema,
  todayInIsrael,
  type CreateNote,
} from './schema';

/**
 * S06 - behavior notes. Contract: openapi/openapi.yaml -> /students/{id}/notes.
 *  - GET  : list of the student's notes (pagination, sort, filters)
 *  - POST : add a note (the author and the date come from the server)
 * Authorization: JWT (requireAuth, mounted by the loader) + permission matrix (authorize('S06')).
 * A `scoped` user (homeroom teacher, teacher) reaches only students of their own classes.
 */
const router = Router();

const parseStudentId = (raw: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(raw)) throw new AppError(400, 'BAD_ID', 'מזהה לא תקין');
  return new Types.ObjectId(raw);
};

/**
 * Checks that the signed-in user may work with this student.
 * 403 does not reveal whether the student exists: for a `scoped` user a missing student and a
 * student of another class give the same answer (the UX principle for 403 messages).
 */
async function assertStudentAccess(req: Request, studentId: Types.ObjectId): Promise<void> {
  const student = await Student.findOne({
    _id: studentId,
    institutionId: req.user!.institutionId,
    deletedAt: null,
  })
    .select('classId')
    .lean();

  if (req.accessLevel === 'scoped') {
    const classIds = await getScopedClassIds(req.user!.id);
    const classId = student?.classId;
    const allowed = !!classId && classIds.some((c) => c.equals(classId));
    if (!allowed) throw new AppError(403, 'FORBIDDEN', 'אין הרשאה לפעולה זו');
  }
  if (!student) throw new AppError(404, 'NOT_FOUND', 'התלמיד לא נמצא');
}

// GET /api/students/:id/notes?page=1&size=25&kind=discipline&from=2026-09-01&to=2026-10-31&sort=-date
router.get(
  '/students/:id/notes',
  authorize('S06', 'read'),
  asyncHandler(async (req, res) => {
    const studentId = parseStudentId(req.params.id);
    const q = listNotesQuerySchema.parse(req.query);
    await assertStudentAccess(req, studentId);

    const filter: FilterQuery<StudentNoteDoc> = {
      institutionId: new Types.ObjectId(req.user!.institutionId),
      studentId,
      deletedAt: null, // soft-deleted notes never appear in the list
    };
    if (q.kind) filter.kind = q.kind;
    if (q.visibleToParent !== undefined) filter.visibleToParent = q.visibleToParent;
    if (q.from || q.to) {
      filter.date = {
        ...(q.from ? { $gte: new Date(`${q.from}T00:00:00.000Z`) } : {}),
        ...(q.to ? { $lte: new Date(`${q.to}T00:00:00.000Z`) } : {}),
      };
    }

    // the _id as a second key keeps the order stable between pages
    const dir = q.sort.startsWith('-') ? -1 : 1;
    const field = q.sort.replace('-', '');
    const sort: Record<string, 1 | -1> =
      field === 'date' ? { date: dir, _id: dir } : { kind: dir, date: -1, _id: -1 };

    const skip = (q.page - 1) * q.size;
    const [rows, total] = await Promise.all([
      StudentNote.find(filter).sort(sort).skip(skip).limit(q.size).lean(),
      StudentNote.countDocuments(filter),
    ]);

    const authors = await User.find({ _id: { $in: rows.map((n) => n.authorId) } })
      .select('firstName lastName')
      .lean();
    const authorName = new Map(authors.map((u) => [String(u._id), `${u.firstName} ${u.lastName}`]));

    const items = rows.map((n) => ({
      id: String(n._id),
      studentId: String(n.studentId),
      date: n.date.toISOString().slice(0, 10),
      kind: n.kind,
      severity: n.severity ?? '',
      description: n.description,
      visibleToParent: n.visibleToParent ?? false,
      authorId: String(n.authorId),
      authorName: authorName.get(String(n.authorId)) ?? '',
      createdAt: n.createdAt,
    }));
    res.json(toPage(items, total, q.page, q.size));
  }),
);

// POST /api/students/:id/notes
router.post(
  '/students/:id/notes',
  authorize('S06', 'write'),
  validateBody(createNoteSchema),
  asyncHandler(async (req, res) => {
    const studentId = parseStudentId(req.params.id);
    await assertStudentAccess(req, studentId);

    const body = req.body as CreateNote;
    const created = await StudentNote.create({
      institutionId: req.user!.institutionId,
      studentId,
      date: new Date(`${body.date ?? todayInIsrael()}T00:00:00.000Z`),
      kind: body.kind,
      severity: body.severity,
      description: body.description,
      visibleToParent: body.visibleToParent,
      authorId: req.user!.id,
    });
    res.status(201).json({ id: String(created._id) });
  }),
);

export default router;
