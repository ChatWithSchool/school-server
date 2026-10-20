import { Types } from 'mongoose';
import { StaffProfile } from '../models';

/**
 * Class ids a teacher or homeroom teacher may see. Use it when `req.accessLevel === 'scoped'`:
 *   const classIds = await getScopedClassIds(req.user.id);
 *   filter.classId = { $in: classIds };
 */
export async function getScopedClassIds(userId: string): Promise<Types.ObjectId[]> {
  const profile = await StaffProfile.findOne({ userId }).select('classIds').lean();
  return (profile?.classIds ?? []) as Types.ObjectId[];
}
