import bcrypt from 'bcryptjs';
import {
  AcademicYear,
  Institution,
  Role,
  SchoolClass,
  StaffProfile,
  Student,
  Subject,
  User,
} from '../models';
import { ROLE_KEYS, type RoleKey } from '../permissions';
import { parFirst, parMail, stfFirst, stfLast, stfMail, stuFirst, stuLast } from './names';

export const DEMO_PASSWORD = 'Demo1234!';
export const INSTITUTION_NAME = 'בית ספר לדוגמה';

const ROLE_NAMES: Record<RoleKey, string> = {
  management: 'הנהלה',
  coordinator: 'רכז/ת',
  secretary: 'מזכירות',
  homeroom: 'מחנך/ת',
  teacher: 'מורה מקצועי',
  parent: 'הורה',
  student: 'תלמיד',
};

const SUBJECTS: [string, string, string[]][] = [
  ['מתמטיקה', 'MATH', ['ז', 'ח', 'ט']],
  ['עברית', 'HEB', ['ז', 'ח', 'ט']],
  ['אנגלית', 'ENG', ['ז', 'ח', 'ט']],
  ['מדעים', 'SCI', ['ז', 'ח', 'ט']],
  ['תנ״ך', 'BIB', ['ז', 'ח', 'ט']],
  ['היסטוריה', 'HIS', ['ח', 'ט']],
  ['גיאוגרפיה', 'GEO', ['ט']],
  ['אמנות', 'ART', ['ז', 'ח']],
];
// [roles, subject code, classes, status]. Exported for the shared-collections seed.
export const STAFF: [RoleKey[], string, string[], 'active' | 'disabled'][] = [
  [['management'], '', [], 'active'],
  [['secretary'], '', [], 'active'],
  [['homeroom', 'teacher'], 'MATH', ['ח1'], 'active'],
  [['homeroom', 'teacher'], 'HEB', ['ח2'], 'active'],
  [['homeroom', 'teacher'], 'BIB', ['ח3'], 'active'],
  [['homeroom', 'teacher'], 'HEB', ['ז1'], 'active'],
  [['homeroom', 'teacher'], 'MATH', ['ז2'], 'active'],
  [['homeroom', 'teacher'], 'SCI', ['ט1'], 'active'],
  [['teacher'], 'ENG', ['ז1', 'ז2', 'ח1'], 'active'],
  [['coordinator', 'teacher'], 'MATH', ['ח2', 'ח3'], 'active'],
  [['teacher'], 'HIS', ['ז1', 'ח2', 'ט1'], 'active'],
  [['teacher'], 'ART', ['ז1', 'ז2', 'ח1', 'ח2', 'ח3', 'ט1'], 'disabled'],
];
const HOMEROOM: Record<string, number> = { ז1: 5, ז2: 6, ח1: 2, ח2: 3, ח3: 4, ט1: 7 };
const CLASS_SIZES: Record<string, number> = { ז1: 8, ז2: 8, ח1: 12, ח2: 10, ח3: 10, ט1: 12 };

/** A valid Israeli ID number from a running index (check digit appended). */
export function makeIsraeliId(n: number): string {
  const base = String(10000000 + n).padStart(8, '0');
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    let d = Number(base[i]) * ((i % 2) + 1);
    if (d > 9) d -= 9;
    sum += d;
  }
  return base + String((10 - (sum % 10)) % 10);
}

/**
 * Idempotent core seed: running it twice changes nothing. Do NOT edit it without the team leads.
 * Add your own demo data in src/modules/<your module>/seed.ts.
 */
export async function seedCore(): Promise<Record<string, number>> {
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 8);
  const year = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1;

  const inst = await Institution.findOneAndUpdate(
    { name: INSTITUTION_NAME },
    {
      $set: {
        name: INSTITUTION_NAME,
        type: 'middle',
        address: 'רחוב הדוגמה 1',
        phone: '03-0000000',
        contactEmail: 'office@school.example',
      },
    },
    { upsert: true, new: true },
  );
  const instId = inst._id;

  const ay = await AcademicYear.findOneAndUpdate(
    { institutionId: instId, name: 'שנת לימודים נוכחית' },
    {
      $set: {
        startDate: new Date(year, 8, 1),
        endDate: new Date(year + 1, 5, 30),
        status: 'active',
      },
    },
    { upsert: true, new: true },
  );
  await Institution.updateOne({ _id: instId }, { $set: { activeYearId: ay._id } });

  for (const key of ROLE_KEYS) {
    await Role.updateOne(
      { institutionId: instId, key },
      { $set: { name: ROLE_NAMES[key], builtIn: true } },
      { upsert: true },
    );
  }

  const subjectIds: Record<string, unknown> = {};
  for (const [name, code, grades] of SUBJECTS) {
    const s = await Subject.findOneAndUpdate(
      { institutionId: instId, code },
      { $set: { name, grades } },
      { upsert: true, new: true },
    );
    subjectIds[code] = s._id;
  }

  const userIds: unknown[] = [];
  for (let i = 0; i < STAFF.length; i++) {
    const [roles, , , status] = STAFF[i];
    const u = await User.findOneAndUpdate(
      { institutionId: instId, email: stfMail(i) },
      { $set: { firstName: stfFirst(i), lastName: stfLast(i), roles, status, passwordHash: hash } },
      { upsert: true, new: true },
    );
    userIds.push(u._id);
  }

  const classIds: Record<string, unknown> = {};
  for (const [name, idx] of Object.entries(HOMEROOM)) {
    const c = await SchoolClass.findOneAndUpdate(
      { institutionId: instId, yearId: ay._id, name },
      { $set: { grade: name[0], homeroomTeacherId: userIds[idx] } },
      { upsert: true, new: true },
    );
    classIds[name] = c._id;
  }

  for (let i = 0; i < STAFF.length; i++) {
    const [, code, classes] = STAFF[i];
    await StaffProfile.updateOne(
      { institutionId: instId, userId: userIds[i] },
      {
        $set: {
          subjectIds: code ? [subjectIds[code]] : [],
          classIds: classes.map((c) => classIds[c]),
          title: ROLE_NAMES[STAFF[i][0][0]],
        },
      },
      { upsert: true },
    );
  }

  let n = 0;
  for (const [className, size] of Object.entries(CLASS_SIZES)) {
    for (let k = 0; k < size; k++) {
      const i = n++;
      await Student.updateOne(
        { institutionId: instId, nationalId: makeIsraeliId(i + 1) },
        {
          $set: {
            firstName: stuFirst(i),
            lastName: stuLast(i),
            classId: classIds[className],
            guardians: [
              {
                name: `${parFirst(i)} ${stuLast(i)}`,
                relation: i % 2 ? 'אב' : 'אם',
                phone: `050-000-${String(1000 + i)}`,
                email: parMail(i),
              },
            ],
            tags: i % 9 === 4 ? ['מעקב'] : [],
            status: 'active',
          },
        },
        { upsert: true },
      );
    }
  }

  // two parent accounts linked to the first students
  for (let p = 0; p < 2; p++) {
    const u = await User.findOneAndUpdate(
      { institutionId: instId, email: parMail(p) },
      {
        $set: {
          firstName: parFirst(p),
          lastName: stuLast(p),
          roles: ['parent'],
          status: 'active',
          passwordHash: hash,
        },
      },
      { upsert: true, new: true },
    );
    await Student.updateOne(
      { institutionId: instId, nationalId: makeIsraeliId(p + 1) },
      { $set: { 'guardians.0.userId': u._id } },
    );
  }

  return {
    institutions: await Institution.countDocuments(),
    users: await User.countDocuments(),
    classes: await SchoolClass.countDocuments(),
    students: await Student.countDocuments(),
    subjects: await Subject.countDocuments(),
  };
}
