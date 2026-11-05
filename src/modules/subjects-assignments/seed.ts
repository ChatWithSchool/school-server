import { SchoolClass, StaffProfile } from '../../models';
import { TeachingAssignment } from './model';

/** Rebuild the demo assignments from the core seed's staff subject/class links. */
export async function seed(): Promise<void> {
  const profiles = await StaffProfile.find().select('institutionId userId subjectIds classIds').lean();
  for (const profile of profiles) {
    for (const subjectId of profile.subjectIds) {
      for (const classId of profile.classIds) {
        const schoolClass = await SchoolClass.findOne({
          _id: classId,
          institutionId: profile.institutionId,
        })
          .select('_id')
          .lean();
        if (!schoolClass) continue;
        await TeachingAssignment.updateOne(
          {
            institutionId: profile.institutionId,
            classId,
            subjectId,
          },
          { $set: { teacherId: profile.userId } },
          { upsert: true },
        );
      }
    }
  }
}
