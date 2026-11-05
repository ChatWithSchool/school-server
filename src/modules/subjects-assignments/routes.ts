import { Router } from 'express';
import { Types } from 'mongoose';
import { AcademicYear, Institution, SchoolClass, StaffProfile, Subject, User } from '../../models';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { TeachingAssignment } from './model';
import {
  createSubjectSchema,
  type CreateSubject,
  updateAssignmentSchema,
  type UpdateAssignment,
} from './schema';

const router = Router();

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

router.get(
  '/subjects',
  authorize('I06', 'read'),
  asyncHandler(async (req, res) => {
    const items = await Subject.find({ institutionId: req.user!.institutionId })
      .sort({ name: 1 })
      .lean();
    res.json({
      items: items.map((subject) => ({
        id: String(subject._id),
        name: subject.name,
        code: subject.code,
        grades: subject.grades,
      })),
      total: items.length,
      page: 1,
      size: items.length,
    });
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
    const duplicate = await Subject.exists({
      institutionId,
      $or: [{ name: input.name }, { code }],
    }).collation({ locale: 'he', strength: 2 });
    if (duplicate) throw new AppError(409, 'SUBJECT_EXISTS', 'שם המקצוע או הקוד כבר קיימים');

    let created;
    try {
      created = await Subject.create({ ...input, code, institutionId });
    } catch (error) {
      if (isDuplicateKeyError(error))
        throw new AppError(409, 'SUBJECT_EXISTS', 'שם המקצוע או הקוד כבר קיימים');
      throw error;
    }
    res.status(201).json({ id: String(created._id) });
  }),
);

router.get(
  '/teaching-assignments',
  authorize('I06', 'read'),
  asyncHandler(async (req, res) => {
    const institutionId = req.user!.institutionId;
    const institution = await Institution.findById(institutionId).select('activeYearId').lean();
    const activeYear =
      institution?.activeYearId ??
      (await AcademicYear.findOne({ institutionId, status: 'active' }).select('_id').lean())?._id;
    const classes = activeYear
      ? await SchoolClass.find({ institutionId, yearId: activeYear })
          .sort({ grade: 1, name: 1 })
          .select('_id name grade')
          .lean()
      : [];
    const classIds = classes.map((item) => item._id);
    const users = await User.find({
      institutionId,
      status: 'active',
      roles: { $in: ['teacher', 'homeroom', 'coordinator'] },
    })
      .sort({ firstName: 1, lastName: 1 })
      .select('_id firstName lastName')
      .lean();
    const profiles = await StaffProfile.find({
      institutionId,
      userId: { $in: users.map((user) => user._id) },
    })
      .select('userId')
      .lean();
    const profileUserIds = new Set(profiles.map((profile) => String(profile.userId)));
    const teachers = users
      .filter((user) => profileUserIds.has(String(user._id)))
      .map((user) => ({
        id: String(user._id),
        firstName: user.firstName,
        lastName: user.lastName,
      }));
    const assignments = classIds.length
      ? await TeachingAssignment.find({ institutionId, classId: { $in: classIds } })
          .select('classId subjectId teacherId')
          .lean()
      : [];

    res.json({
      classes: classes.map((item) => ({
        id: String(item._id),
        name: item.name,
        grade: item.grade,
      })),
      teachers,
      assignments: assignments.map((item) => ({
        classId: String(item.classId),
        subjectId: String(item.subjectId),
        teacherId: String(item.teacherId),
      })),
    });
  }),
);

router.put(
  '/classes/:id/teaching-assignments',
  authorize('I06', 'write'),
  validateBody(updateAssignmentSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'BAD_ID', 'מזהה כיתה לא תקין');

    const { subjectId, teacherId } = req.body as UpdateAssignment;
    const institutionId = req.user!.institutionId;
    const schoolClass = await SchoolClass.findOne({ _id: id, institutionId }).select('_id').lean();
    if (!schoolClass) throw new AppError(404, 'CLASS_NOT_FOUND', 'הכיתה לא נמצאה');
    const subjectExists = await Subject.exists({ _id: subjectId, institutionId });
    if (!subjectExists) throw new AppError(404, 'SUBJECT_NOT_FOUND', 'המקצוע לא נמצא');

    const filter = { institutionId, classId: id, subjectId };
    if (teacherId === null) {
      await TeachingAssignment.deleteOne(filter);
    } else {
      const teacher = await User.exists({
        _id: teacherId,
        institutionId,
        status: 'active',
        roles: { $in: ['teacher', 'homeroom', 'coordinator'] },
      });
      const profile = teacher
        ? await StaffProfile.exists({ institutionId, userId: teacherId })
        : null;
      if (!profile) throw new AppError(404, 'TEACHER_NOT_FOUND', 'המורה לא נמצא/ה');
      await TeachingAssignment.findOneAndUpdate(
        filter,
        { $set: { teacherId } },
        { upsert: true, new: true, runValidators: true },
      );
    }

    res.status(204).end();
  }),
);

export default router;
