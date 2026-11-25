import {
  AcademicYear,
  Institution,
  SchoolClass,
  StaffProfile,
  Student,
  Subject,
} from '../../models';
import { Group, GroupMember } from './model';

export async function seed(): Promise<void> {
  const inst = await Institution.findOne({ name: 'בית ספר לדוגמה' });
  if (!inst) return;

  const ay = await AcademicYear.findOne({ institutionId: inst._id, status: 'active' });
  if (!ay) return;

  const math = await Subject.findOne({ institutionId: inst._id, code: 'MATH' });
  const eng = await Subject.findOne({ institutionId: inst._id, code: 'ENG' });
  if (!math || !eng) throw new Error('Missing seeded subjects for groups');

  const classZ1 = await SchoolClass.findOne({ institutionId: inst._id, name: 'ז1' });
  const classZ2 = await SchoolClass.findOne({ institutionId: inst._id, name: 'ז2' });
  if (!classZ1 || !classZ2) throw new Error('Missing seeded classes for groups');

  const [mathTeacher, englishTeacher] = await Promise.all([
    StaffProfile.findOne({ institutionId: inst._id, subjectIds: math._id }).sort({ userId: 1 }),
    StaffProfile.findOne({ institutionId: inst._id, subjectIds: eng._id }).sort({ userId: 1 }),
  ]);
  if (!mathTeacher || !englishTeacher) throw new Error('Missing seeded teachers for groups');

  // קבוצות לימוד
  const groups = [
    {
      name: "הקבצה א' מתמטיקה",
      gradeLevel: 'ז',
      subjectId: math._id,
      teacherId: mathTeacher.userId,
    },
    {
      name: "הקבצה ב' מתמטיקה",
      gradeLevel: 'ז',
      subjectId: math._id,
      teacherId: mathTeacher.userId,
    },
    {
      name: 'קבוצת אנגלית מתקדמים',
      gradeLevel: null,
      subjectId: eng._id,
      teacherId: englishTeacher.userId,
    },
  ];

  for (const g of groups) {
    await Group.updateOne(
      { institutionId: inst._id, yearId: ay._id, name: g.name },
      {
        $set: {
          type: 'study',
          gradeLevel: g.gradeLevel,
          subjectId: g.subjectId,
          teacherId: g.teacherId,
        },
        $setOnInsert: {
          institutionId: inst._id,
          yearId: ay._id,
          name: g.name,
        },
      },
      { upsert: true },
    );
  }

  // שיוך תלמידים - תלמידי ז1 ו-ז2 לקבוצת מתמטיקה
  const group = await Group.findOne({
    institutionId: inst._id,
    yearId: ay._id,
    name: "הקבצה א' מתמטיקה",
  });
  if (!group) return;

  const [studentsZ1, studentsZ2] = await Promise.all(
    [classZ1, classZ2].map((schoolClass) =>
      Student.find({ institutionId: inst._id, classId: schoolClass._id }).sort({ _id: 1 }).limit(3),
    ),
  );
  const students = [...studentsZ1, ...studentsZ2];
  const studentIds = students.map((student) => student._id);

  await GroupMember.deleteMany({ groupId: group._id, studentId: { $nin: studentIds } });

  for (const s of students) {
    await GroupMember.updateOne(
      { groupId: group._id, studentId: s._id },
      { $setOnInsert: { institutionId: inst._id, groupId: group._id, studentId: s._id } },
      { upsert: true },
    );
  }
}
