import { Assessment, Institution } from '../../models';

/**
 * G04 has no private collection: assessments is shared, and its demo data is in
 * src/seed/shared/grades.ts. This seed writes nothing; it only warns when the shared data the
 * screen needs is missing. The states that the shared seed does not cover yet (no date, weights
 * that do not add up to 100, no grade entered, an empty list) were sent to the team lead.
 */
export async function seed(): Promise<void> {
  const inst = await Institution.findOne({ name: 'בית ספר לדוגמה' });
  if (!inst) return;
  const count = await Assessment.countDocuments({ institutionId: inst._id });
  if (count === 0)
    console.warn('G04: the shared seed has no assessments; run the shared seed first');
}
