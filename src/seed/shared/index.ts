import {
  Assessment,
  AttendanceAlert,
  AttendanceRecord,
  Grade,
  GradeFeedback,
  Invite,
  Lesson,
  Room,
  SchoolEvent,
  TeachingAssignment,
} from '../../models';
import { seedAttendance } from './attendance';
import { loadContext } from './context';
import { seedGrades } from './grades';
import { seedInvites } from './invites';
import { seedEvents, seedLessons, seedRooms, seedTeachingAssignments } from './timetable';

/**
 * Idempotent seed of the shared collections. Runs after the core seed and before the module
 * seeds, so every module can rely on this data. The order matters: each step uses the ones
 * before it. Do NOT edit it without the team leads.
 */
export async function seedShared(now: Date = new Date()): Promise<Record<string, number>> {
  const ctx = await loadContext(now);
  if (!ctx) throw new Error('seedShared: run the core seed first');

  const roomIds = await seedRooms(ctx);
  await seedEvents(ctx);
  const byClass = await seedTeachingAssignments(ctx);
  await seedLessons(ctx, byClass, roomIds);
  await seedGrades(ctx);
  await seedAttendance(ctx);
  await seedInvites(ctx);

  return {
    rooms: await Room.countDocuments(),
    events: await SchoolEvent.countDocuments(),
    teaching_assignments: await TeachingAssignment.countDocuments(),
    lessons: await Lesson.countDocuments(),
    assessments: await Assessment.countDocuments(),
    grades: await Grade.countDocuments(),
    grade_feedback: await GradeFeedback.countDocuments(),
    attendance_records: await AttendanceRecord.countDocuments(),
    attendance_alerts: await AttendanceAlert.countDocuments(),
    invites: await Invite.countDocuments(),
  };
}
