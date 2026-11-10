/** The core collections. They are owned by the team leads: change them only through a PR they approve. */
export { Institution } from './institution.model';
export { AcademicYear } from './academicYear.model';
export { User } from './user.model';
export { Role, RolePermission } from './role.model';
export { StaffProfile } from './staffProfile.model';
export { SchoolClass } from './schoolClass.model';
export { Student } from './student.model';
export { Subject } from './subject.model';

/** Shared collections: more than one module reads them, so they live in the core too. */
export { Room } from './room.model';
export { SchoolEvent } from './schoolEvent.model';
export { TeachingAssignment } from './teachingAssignment.model';
export { Lesson } from './lesson.model';
export { Invite } from './invite.model';
export { Assessment } from './assessment.model';
export { Grade } from './grade.model';
export { GradeFeedback } from './gradeFeedback.model';
export { AttendanceRecord } from './attendanceRecord.model';
export { AttendanceAlert } from './attendanceAlert.model';
