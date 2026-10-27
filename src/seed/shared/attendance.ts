import type { Types } from 'mongoose';
import { AttendanceAlert, AttendanceRecord } from '../../models';
import type { SeedContext } from './context';
import { vacationDay } from './timetable';

const SCHOOL_DAYS = 20;
const STREAK = 3; // absent this many school days in a row
const MONTHLY = 3; // absent this many times in the current month

type Status = 'present' | 'absent' | 'late';

/**
 * Daily attendance for the last 20 school days, without the vacation day. Mostly present, with a
 * few absences and lateness from a formula, plus two fixed cases so N04 and X03 have alerts:
 * the first student of ט1 is absent the last 3 days (a streak), the first student of ח1 is absent
 * 3 separate days (monthly).
 */
export function statusFor(classIndex: number, s: number, d: number): Status {
  if ((s * 7 + d * 3 + classIndex * 5) % 41 === 0) return 'absent';
  if ((s * 11 + d * 5 + classIndex) % 29 === 0) return 'late';
  return 'present';
}

export async function seedAttendance(ctx: SeedContext): Promise<void> {
  const off = vacationDay(ctx);
  const days = ctx.schoolDays(SCHOOL_DAYS).filter((d) => d !== off);
  const last = days.length - 1;
  const forced: Record<string, Record<number, Status>> = {
    // student index 0 of the class -> day index -> status
    ט1: { [last]: 'absent', [last - 1]: 'absent', [last - 2]: 'absent' },
    ח1: { [last - 1]: 'absent', [last - 3]: 'absent', [last - 5]: 'absent' },
  };
  const classes = Object.keys(ctx.studentsByClass).sort();
  const thisMonth = ctx.dayOffset(0).slice(0, 7);

  for (let ci = 0; ci < classes.length; ci++) {
    const name = classes[ci];
    const students = ctx.studentsByClass[name];
    const markedBy = ctx.homeroomByClass[name];
    for (let s = 0; s < students.length; s++) {
      const statuses = days.map((_, d) =>
        s === 0 && forced[name]?.[d] ? forced[name][d] : statusFor(ci, s, d),
      );
      for (let d = 0; d < days.length; d++) {
        await AttendanceRecord.updateOne(
          { studentId: students[s], date: days[d], period: null },
          {
            $set: {
              institutionId: ctx.instId,
              classId: ctx.classIds[name],
              status: statuses[d],
              markedBy,
            },
          },
          { upsert: true },
        );
      }
      await openAlerts(ctx, name, students[s], days, statuses, thisMonth);
    }
  }

  // one handled alert from the past, so the 'closed' state has data too
  const first = ctx.studentsByClass['ז1']?.[0];
  if (first) {
    await AttendanceAlert.updateOne(
      { studentId: first, type: 'streak', status: 'closed' },
      {
        $set: {
          institutionId: ctx.instId,
          classId: ctx.classIds['ז1'],
          since: ctx.dayOffset(-45),
          count: 3,
          closedBy: ctx.homeroomByClass['ז1'],
          closeNote: 'שיחה עם ההורים, הסיבה ידועה.',
          closedAt: new Date(ctx.now.getTime() - 40 * 86_400_000),
        },
      },
      { upsert: true },
    );
  }
}

/** The alerts that follow from one student's records, by the same rules N04 applies. */
async function openAlerts(
  ctx: SeedContext,
  className: string,
  studentId: Types.ObjectId,
  days: string[],
  statuses: Status[],
  thisMonth: string,
): Promise<void> {
  let run = 0;
  while (run < statuses.length && statuses[statuses.length - 1 - run] === 'absent') run++;
  const monthAbsences = days.filter((d, i) => d.startsWith(thisMonth) && statuses[i] === 'absent');

  const alerts: { type: 'streak' | 'monthly'; since: string; count: number }[] = [];
  if (run >= STREAK) alerts.push({ type: 'streak', since: days[days.length - run], count: run });
  if (monthAbsences.length >= MONTHLY) {
    alerts.push({ type: 'monthly', since: monthAbsences[0], count: monthAbsences.length });
  }
  for (const a of alerts) {
    await AttendanceAlert.updateOne(
      { studentId, type: a.type, status: 'open' },
      {
        $set: {
          institutionId: ctx.instId,
          classId: ctx.classIds[className],
          since: a.since,
          count: a.count,
        },
      },
      { upsert: true },
    );
  }
}
