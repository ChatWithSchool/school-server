import { AttendanceAlert, AttendanceRecord } from '../../models';
import type { SeedContext } from './context';
import { vacationDay } from './timetable';

const SCHOOL_DAYS = 20;
export const STREAK = 3; // absent this many school days in a row
export const MONTHLY = 3; // absent this many times in one calendar month

type Status = 'present' | 'absent' | 'late';

/** A number that depends only on the day itself, so a date keeps its status on every run. */
const dayNumber = (day: string) => Number(day.replaceAll('-', '')) % 97;

export function statusFor(classIndex: number, s: number, day: string): Status {
  const n = dayNumber(day);
  if ((s * 7 + n * 3 + classIndex * 5) % 41 === 0) return 'absent';
  if ((s * 11 + n * 5 + classIndex) % 29 === 0) return 'late';
  return 'present';
}

/**
 * Daily attendance for the last 20 school days, without the vacation day, and the alerts that
 * follow from it. The window moves with today, so the seed REPLACES the attendance and the
 * alerts of the demo institution on every run: old days and stale alerts never pile up.
 * Two fixed cases give N04 and X03 open alerts: the first student of ט1 is absent the last 3 days
 * (always a streak alert), and the first student of ח1 is absent 3 separate days (a monthly alert
 * when those days fall in the same month, which is not the case early in a month).
 */
export async function seedAttendance(ctx: SeedContext): Promise<void> {
  const off = vacationDay(ctx);
  const days = ctx.schoolDays(SCHOOL_DAYS).filter((d) => d !== off);
  const last = days.length - 1;
  const forced: Record<string, Record<number, Status>> = {
    // student index 0 of the class -> day index -> status
    ט1: { [last]: 'absent', [last - 1]: 'absent', [last - 2]: 'absent' },
    ח1: { [last - 1]: 'absent', [last - 3]: 'absent', [last - 5]: 'absent' },
  };

  await AttendanceRecord.deleteMany({ institutionId: ctx.instId });
  await AttendanceAlert.deleteMany({ institutionId: ctx.instId });

  const records: Record<string, unknown>[] = [];
  const alerts: Record<string, unknown>[] = [];
  const classes = Object.keys(ctx.studentsByClass).sort();
  for (let ci = 0; ci < classes.length; ci++) {
    const name = classes[ci];
    const students = ctx.studentsByClass[name];
    for (let s = 0; s < students.length; s++) {
      const statuses = days.map((day, d) =>
        s === 0 && forced[name]?.[d] ? forced[name][d] : statusFor(ci, s, day),
      );
      days.forEach((date, d) =>
        records.push({
          institutionId: ctx.instId,
          classId: ctx.classIds[name],
          studentId: students[s],
          date,
          period: null,
          status: statuses[d],
          markedBy: ctx.homeroomByClass[name],
        }),
      );
      for (const a of alertsFor(days, statuses)) {
        alerts.push({
          ...a,
          institutionId: ctx.instId,
          classId: ctx.classIds[name],
          studentId: students[s],
        });
      }
    }
  }
  await AttendanceRecord.insertMany(records);

  // one handled alert from the past, so the 'closed' state has data too
  const first = ctx.studentsByClass['ז1']?.[0];
  if (first) {
    alerts.push({
      institutionId: ctx.instId,
      classId: ctx.classIds['ז1'],
      studentId: first,
      type: 'streak',
      since: ctx.dayOffset(-45),
      count: 3,
      status: 'closed',
      closedBy: ctx.homeroomByClass['ז1'],
      closeNote: 'שיחה עם ההורים, הסיבה ידועה.',
      closedAt: new Date(ctx.now.getTime() - 40 * 86_400_000),
    });
  }
  await AttendanceAlert.insertMany(alerts);
}

/**
 * The open alerts that follow from one student's daily statuses, by the rules N04 applies:
 * a streak of absences up to the last school day, and too many absences in one calendar month.
 */
export function alertsFor(
  days: string[],
  statuses: Status[],
): { type: 'streak' | 'monthly'; since: string; month: string | null; count: number }[] {
  const out: { type: 'streak' | 'monthly'; since: string; month: string | null; count: number }[] =
    [];
  let run = 0;
  while (run < statuses.length && statuses[statuses.length - 1 - run] === 'absent') run++;
  if (run >= STREAK)
    out.push({ type: 'streak', since: days[days.length - run], month: null, count: run });

  const byMonth = new Map<string, string[]>();
  days.forEach((d, i) => {
    if (statuses[i] === 'absent')
      byMonth.set(d.slice(0, 7), [...(byMonth.get(d.slice(0, 7)) ?? []), d]);
  });
  for (const [month, absent] of byMonth) {
    if (absent.length >= MONTHLY)
      out.push({ type: 'monthly', since: absent[0], month, count: absent.length });
  }
  return out;
}
