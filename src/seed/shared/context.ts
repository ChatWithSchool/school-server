import type { Types } from 'mongoose';
import { Institution, SchoolClass, Student, Subject, User } from '../../models';
import { INSTITUTION_NAME, STAFF } from '../core';
import { stfMail } from '../names';
import { addDays, toDateOnly, weekday } from '../../utils/dateOnly';

type Id = Types.ObjectId;

/** What the shared seeds need from the core seed, loaded once. */
export type SeedContext = {
  instId: Id;
  yearId: Id;
  /** The user id of STAFF[i] (same index as in core.ts). */
  staffIds: Id[];
  classIds: Record<string, Id>;
  /** The class name ('ז1') of each class id, the reverse of classIds. */
  classNames: Map<string, string>;
  homeroomByClass: Record<string, Id>;
  subjectIds: Record<string, Id>;
  /** Students of each class, ordered by national id so the order never changes. */
  studentsByClass: Record<string, Id[]>;
  /** The school days (Sunday to Thursday) before `now`, oldest first. */
  schoolDays: (count: number) => string[];
  /** Today (in the school's time zone) moved by whole days, as 'YYYY-MM-DD'. */
  dayOffset: (days: number) => string;
  now: Date;
};

export async function loadContext(now: Date): Promise<SeedContext | null> {
  const inst = await Institution.findOne({ name: INSTITUTION_NAME });
  if (!inst?.activeYearId) return null;
  const instId = inst._id;

  const staffIds: Id[] = [];
  for (let i = 0; i < STAFF.length; i++) {
    const u = await User.findOne({ institutionId: instId, email: stfMail(i) });
    if (!u) return null;
    staffIds.push(u._id);
  }

  const classIds: Record<string, Id> = {};
  const classNames = new Map<string, string>();
  const homeroomByClass: Record<string, Id> = {};
  for (const c of await SchoolClass.find({ institutionId: instId, yearId: inst.activeYearId })) {
    classIds[c.name] = c._id;
    classNames.set(String(c._id), c.name);
    if (c.homeroomTeacherId) homeroomByClass[c.name] = c.homeroomTeacherId;
  }

  const subjectIds: Record<string, Id> = {};
  for (const s of await Subject.find({ institutionId: instId })) subjectIds[s.code] = s._id;

  const studentsByClass: Record<string, Id[]> = {};
  for (const [name, id] of Object.entries(classIds)) {
    const students = await Student.find({ classId: id, status: 'active' }).sort({ nationalId: 1 });
    studentsByClass[name] = students.map((s) => s._id);
  }

  const today = toDateOnly(now);
  const dayOffset = (days: number) => addDays(today, days);
  const schoolDays = (count: number) => {
    const days: string[] = [];
    for (let back = 1; days.length < count; back++) {
      const day = addDays(today, -back);
      if (weekday(day) <= 4) days.unshift(day);
    }
    return days;
  };

  return {
    instId,
    yearId: inst.activeYearId,
    staffIds,
    classIds,
    classNames,
    homeroomByClass,
    subjectIds,
    studentsByClass,
    schoolDays,
    dayOffset,
    now,
  };
}
