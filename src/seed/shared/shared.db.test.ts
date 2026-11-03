import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../../db/connect';
import {
  Assessment,
  AttendanceAlert,
  AttendanceRecord,
  Invite,
  Lesson,
  Room,
  SchoolEvent,
} from '../../models';
import { weekday } from '../../utils/dateOnly';
import { seedCore } from '../core';
import { seedShared } from '.';
import { alertsFor } from './attendance';

// Integration test: runs only when MONGODB_URI_TEST is set (a local MongoDB or the CI service).
const base = process.env.MONGODB_URI_TEST;
const describeDb = base ? describe : describe.skip;

/** Its own database, so it can drop it while other database tests run in parallel. */
function ownDatabase(uri: string): string {
  const url = new URL(uri);
  url.pathname = `${url.pathname.replace(/\/$/, '') || '/school_test'}_shared_seed`;
  return url.toString();
}

const NOW = new Date('2026-10-27T08:00:00Z'); // a Tuesday
const NEXT_DAY = new Date('2026-10-28T08:00:00Z');

/** Every attendance record as one sorted list of strings, to compare whole contents. */
async function attendanceSnapshot(): Promise<string[]> {
  const records = await AttendanceRecord.find().lean();
  return records.map((r) => `${r.studentId}|${r.date}|${r.status}`).sort();
}

/** The open alerts must be exactly the ones the records lead to: no missing and no stale ones. */
async function expectAlertsMatchRecords(): Promise<void> {
  const records = await AttendanceRecord.find().sort({ date: 1 }).lean();
  const byStudent = new Map<
    string,
    { days: string[]; statuses: ('present' | 'absent' | 'late')[] }
  >();
  for (const r of records) {
    const entry = byStudent.get(String(r.studentId)) ?? { days: [], statuses: [] };
    entry.days.push(r.date);
    entry.statuses.push(r.status);
    byStudent.set(String(r.studentId), entry);
  }
  const expected = [...byStudent].flatMap(([studentId, { days, statuses }]) =>
    alertsFor(days, statuses).map((a) => `${studentId}|${a.type}|${a.month}|${a.since}|${a.count}`),
  );
  const open = await AttendanceAlert.find({ status: 'open' }).lean();
  const actual = open.map((a) => `${a.studentId}|${a.type}|${a.month}|${a.since}|${a.count}`);
  expect(actual.sort()).toEqual(expected.sort());
}

describeDb('shared seed (with a database)', () => {
  jest.setTimeout(120_000);
  let first: Record<string, number> = {};

  beforeAll(async () => {
    await connectDb(ownDatabase(base!));
    await mongoose.connection.dropDatabase();
    await seedCore();
    first = await seedShared(NOW);
  });
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectDb();
  });

  it('fills every shared collection and changes nothing when run again the same day', async () => {
    for (const [name, count] of Object.entries(first)) {
      expect({ name, filled: count > 0 }).toEqual({ name, filled: true });
    }
    const before = await attendanceSnapshot();
    const hashes = (await Invite.find().select('+tokenHash').lean()).map((i) => i.tokenHash);
    expect(await seedShared(NOW)).toEqual(first);
    expect(await attendanceSnapshot()).toEqual(before);
    // the random invite tokens are created once and kept
    expect((await Invite.find().select('+tokenHash').lean()).map((i) => i.tokenHash)).toEqual(
      hashes,
    );
  });

  it('builds a timetable without clashes, using active rooms only', async () => {
    const lessons = await Lesson.find().lean();
    for (const who of ['classId', 'teacherId', 'roomId'] as const) {
      const slots = lessons
        .filter((l) => l[who] !== null)
        .map((l) => `${String(l[who])}|${l.dayOfWeek}|${l.period}`);
      expect(new Set(slots).size).toBe(slots.length);
    }
    const active = new Set((await Room.find({ active: true }).lean()).map((r) => String(r._id)));
    expect(lessons.every((l) => l.roomId === null || active.has(String(l.roomId)))).toBe(true);
  });

  it('opens exactly the alerts that the attendance records lead to', async () => {
    expect(
      await AttendanceAlert.countDocuments({ type: 'streak', status: 'open' }),
    ).toBeGreaterThan(0);
    await expectAlertsMatchRecords();
  });

  it('gives every class and subject assessment weights that add up to 100', async () => {
    const sums = await Assessment.aggregate<{ total: number }>([
      { $group: { _id: { c: '$classId', s: '$subjectId' }, total: { $sum: '$weight' } } },
    ]);
    expect(sums.every((x) => x.total === 100)).toBe(true);
  });

  it('never returns the invite token hash unless asked for', async () => {
    const invite = await Invite.findOne().lean();
    expect(invite).not.toHaveProperty('tokenHash');
  });

  it('stays consistent when run again on another day', async () => {
    const counts = await seedShared(NEXT_DAY);
    // the window moves: old days are replaced, not added
    expect(counts.attendance_records).toBe(first.attendance_records);

    const vacation = await SchoolEvent.findOne({ type: 'vacation' }).lean();
    const dates: string[] = await AttendanceRecord.distinct('date');
    expect(dates).not.toContain(vacation!.startDate);
    expect(dates.every((d) => weekday(d) <= 4)).toBe(true);
    await expectAlertsMatchRecords();
  });
});
