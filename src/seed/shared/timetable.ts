import type { Types } from 'mongoose';
import { Lesson, Room, SchoolEvent, TeachingAssignment } from '../../models';
import { STAFF } from '../core';
import type { SeedContext } from './context';

const DAYS = 5; // Sunday to Thursday
const PERIODS = 6;

/** The vacation day: one of the last 20 school days, so attendance shows a day off. */
export const vacationDay = (ctx: SeedContext) => ctx.schoolDays(20)[11];

/** Returns the ids of the active rooms, by name. */
export async function seedRooms(ctx: SeedContext): Promise<Record<string, Types.ObjectId>> {
  const rooms: {
    name: string;
    type: 'classroom' | 'lab' | 'hall';
    capacity: number;
    active: boolean;
  }[] = [
    ...Object.keys(ctx.classIds).map((c) => ({
      name: `חדר ${c}`,
      type: 'classroom' as const,
      capacity: 32,
      active: true,
    })),
    { name: 'מעבדת מדעים', type: 'lab', capacity: 24, active: true },
    { name: 'אולם', type: 'hall', capacity: 200, active: true },
    { name: 'חדר 12', type: 'classroom', capacity: 20, active: false },
  ];
  const ids: Record<string, Types.ObjectId> = {};
  for (const r of rooms) {
    const doc = await Room.findOneAndUpdate(
      { institutionId: ctx.instId, name: r.name },
      { $set: r },
      { upsert: true, new: true },
    );
    // only active rooms can get lessons
    if (r.active) ids[r.name] = doc._id;
  }
  return ids;
}

export async function seedEvents(ctx: SeedContext): Promise<void> {
  const events: {
    title: string;
    type: 'holiday' | 'event' | 'parents_day' | 'vacation';
    startDate: string;
    endDate: string;
    gradeLevels: string[];
  }[] = [
    {
      title: 'יום חופשה',
      type: 'vacation',
      startDate: vacationDay(ctx),
      endDate: vacationDay(ctx),
      gradeLevels: [],
    },
    {
      title: 'טקס פתיחת שנה',
      type: 'event',
      startDate: ctx.dayOffset(-40),
      endDate: ctx.dayOffset(-40),
      gradeLevels: [],
    },
    {
      title: 'יום מורשת לשכבה ח',
      type: 'event',
      startDate: ctx.dayOffset(5),
      endDate: ctx.dayOffset(5),
      gradeLevels: ['ח'],
    },
    {
      title: 'ערב הורים',
      type: 'parents_day',
      startDate: ctx.dayOffset(10),
      endDate: ctx.dayOffset(10),
      gradeLevels: [],
    },
    {
      title: 'חג',
      type: 'holiday',
      startDate: ctx.dayOffset(20),
      endDate: ctx.dayOffset(22),
      gradeLevels: [],
    },
  ];
  for (const e of events) {
    await SchoolEvent.updateOne(
      { institutionId: ctx.instId, yearId: ctx.yearId, title: e.title },
      { $set: e },
      { upsert: true },
    );
  }
}

type Assignment = {
  classId: Types.ObjectId;
  subjectId: Types.ObjectId;
  teacherId: Types.ObjectId;
  code: string;
};

/** Who teaches what where, taken from the STAFF table of the core seed (active staff only). */
export async function seedTeachingAssignments(
  ctx: SeedContext,
): Promise<Record<string, Assignment[]>> {
  const byClass: Record<string, Assignment[]> = {};
  for (let i = 0; i < STAFF.length; i++) {
    const [, code, classes, status] = STAFF[i];
    if (!code || status !== 'active') continue;
    for (const c of classes) {
      const a = {
        classId: ctx.classIds[c],
        subjectId: ctx.subjectIds[code],
        teacherId: ctx.staffIds[i],
        code,
      };
      await TeachingAssignment.updateOne(
        {
          institutionId: ctx.instId,
          yearId: ctx.yearId,
          classId: a.classId,
          subjectId: a.subjectId,
          teacherId: a.teacherId,
        },
        { $set: {} },
        { upsert: true },
      );
      (byClass[c] ??= []).push(a);
    }
  }
  return byClass;
}

/**
 * A weekly timetable without clashes: for every slot each class takes the next assignment whose
 * teacher and room are both still free in that slot. Each class sits in its own room, science in
 * the lab. Only active rooms are used.
 */
export async function seedLessons(
  ctx: SeedContext,
  byClass: Record<string, Assignment[]>,
  roomIds: Record<string, Types.ObjectId>,
): Promise<void> {
  const roomFor = (a: Assignment, className: string) =>
    roomIds[a.code === 'SCI' ? 'מעבדת מדעים' : `חדר ${className}`] ?? null;
  const classes = Object.keys(byClass).sort();
  for (let day = 0; day < DAYS; day++) {
    for (let period = 1; period <= PERIODS; period++) {
      const busy = new Set<string>();
      for (let ci = 0; ci < classes.length; ci++) {
        const name = classes[ci];
        const options = byClass[name];
        const start = (day * PERIODS + period + ci) % options.length;
        let chosen: Assignment | null = null;
        for (let k = 0; k < options.length && !chosen; k++) {
          const a = options[(start + k) % options.length];
          const room = roomFor(a, name);
          const free = !busy.has(`t:${a.teacherId}`) && !(room && busy.has(`r:${room}`));
          if (free) chosen = a;
        }
        const key = {
          institutionId: ctx.instId,
          yearId: ctx.yearId,
          classId: ctx.classIds[name],
          dayOfWeek: day,
          period,
        };
        if (!chosen) {
          // a free period: remove a lesson a previous run may have put here
          await Lesson.deleteOne(key);
          continue;
        }
        const roomId = roomFor(chosen, name);
        busy.add(`t:${chosen.teacherId}`);
        if (roomId) busy.add(`r:${roomId}`);
        await Lesson.updateOne(
          key,
          { $set: { subjectId: chosen.subjectId, teacherId: chosen.teacherId, roomId } },
          { upsert: true },
        );
      }
    }
  }
}
