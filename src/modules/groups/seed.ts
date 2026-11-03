import { AcademicYear, Institution, SchoolClass, Student, Subject } from '../../models';
import { Group, GroupMember } from './model';

export async function seed(): Promise<void> {
  const inst = await Institution.findOne({ name: 'בית ספר לדוגמה' });
  if (!inst) return;

  const ay = await AcademicYear.findOne({ institutionId: inst._id, status: 'active' });
  if (!ay) return;

  const math = await Subject.findOne({ institutionId: inst._id, code: 'MATH' });
  const eng = await Subject.findOne({ institutionId: inst._id, code: 'ENG' });

  const classZ1 = await SchoolClass.findOne({ institutionId: inst._id, name: 'ז1' });
  const classZ2 = await SchoolClass.findOne({ institutionId: inst._id, name: 'ז2' });

  // קבוצות לימוד
  const groups = [
    {
      name: "הקבצה א' מתמטיקה",
      gradeLevel: 'ז',
      subjectId: math?._id ?? null,
      teacherId: null,
    },
    {
      name: "הקבצה ב' מתמטיקה",
      gradeLevel: 'ז',
      subjectId: math?._id ?? null,
      teacherId: null,
    },
    {
      name: "קבוצת אנגלית מתקדמים",
      gradeLevel: null,
      subjectId: eng?._id ?? null,
      teacherId: null,
    },
  ];

  for (const g of groups) {
    await Group.updateOne(
      { institutionId: inst._id, yearId: ay._id, name: g.name },
      {
        $setOnInsert: {
          institutionId: inst._id,
          yearId: ay._id,
          type: 'study',
          ...g,
        },
      },
      { upsert: true },
    );
  }

  // שיוך תלמידים - תלמידי ז1 ו-ז2 לקבוצת מתמטיקה
  const group = await Group.findOne({ institutionId: inst._id, name: "הקבצה א' מתמטיקה" });
  if (!group) return;

  const students = await Student.find({
    institutionId: inst._id,
    classId: { $in: [classZ1?._id, classZ2?._id] },
  }).limit(6);

  for (const s of students) {
    await GroupMember.updateOne(
      { groupId: group._id, studentId: s._id },
      { $setOnInsert: { institutionId: inst._id, groupId: group._id, studentId: s._id } },
      { upsert: true },
    );
  }
}
