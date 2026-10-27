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
import { seedCore } from '../core';
import { seedShared } from '.';

// Integration test: runs only when MONGODB_URI_TEST is set (a local MongoDB or the CI service).
const base = process.env.MONGODB_URI_TEST;
const describeDb = base ? describe : describe.skip;

/** Its own database, so it can drop it while other database tests run in parallel. */
function ownDatabase(uri: string): string {
  const url = new URL(uri);
  url.pathname = `${url.pathname.replace(/\/$/, '') || '/school_test'}_shared_seed`;
  return url.toString();
}

const NOW = new Date(2026, 9, 27, 10, 0); // a Tuesday

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

  it('fills every shared collection and changes nothing when run again', async () => {
    for (const [name, count] of Object.entries(first)) {
      expect({ name, filled: count > 0 }).toEqual({ name, filled: true });
    }
    expect(await seedShared(NOW)).toEqual(first);
  });

  it('builds a timetable without clashes, and never in a disabled room', async () => {
    const lessons = await Lesson.find().lean();
    for (const who of ['classId', 'teacherId', 'roomId'] as const) {
      const slots = lessons.map((l) => `${String(l[who])}|${l.dayOfWeek}|${l.period}`);
      expect(new Set(slots).size).toBe(slots.length);
    }
    const disabled = await Room.find({ active: false }).lean();
    const used = new Set(lessons.map((l) => String(l.roomId)));
    expect(disabled.some((r) => used.has(String(r._id)))).toBe(false);
  });

  it('marks attendance only on school days, never on the vacation day', async () => {
    const vacation = await SchoolEvent.findOne({ type: 'vacation' }).lean();
    const dates: string[] = await AttendanceRecord.distinct('date');
    expect(dates).not.toContain(vacation!.startDate);
    for (const d of dates) {
      const [y, m, day] = d.split('-').map(Number);
      expect(new Date(y, m - 1, day).getDay()).toBeLessThanOrEqual(4);
    }
  });

  it('opens a streak alert only when the records show that streak', async () => {
    const streaks = await AttendanceAlert.find({ type: 'streak', status: 'open' }).lean();
    expect(streaks.length).toBeGreaterThan(0);
    for (const a of streaks) {
      const recent = await AttendanceRecord.find({ studentId: a.studentId })
        .sort({ date: -1 })
        .limit(a.count!)
        .lean();
      expect(recent.every((r) => r.status === 'absent')).toBe(true);
      expect(recent[recent.length - 1].date).toBe(a.since);
    }
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
});
