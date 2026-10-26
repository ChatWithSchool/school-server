import { Institution, Student } from '../../models';
import { Guardian } from './model';

/** Idempotent: upsert לפי תלמיד + אימייל, כך שהרצה חוזרת לא יוצרת כפילויות. */
export async function seed(): Promise<void> {
  const inst = await Institution.findOne({ name: 'בית ספר לדוגמה' });
  if (!inst) return;
  const students = await Student.find({ institutionId: inst._id }).sort({ _id: 1 }).limit(3);
  if (students.length < 3) return;

  const mother = { email: 'ronit.levi@school.example', name: 'רונית לוי', relation: 'אמא' };
  const father = { email: 'david.katz@school.example', name: 'דוד כץ', relation: 'אבא' };

  // תלמיד 0: שני הורים. תלמיד 1: אותה אמא (הורה עם שני ילדים). תלמיד 2: האבא.
  const links = [
    { student: students[0], parent: mother },
    { student: students[0], parent: father },
    { student: students[1], parent: mother },
    { student: students[2], parent: father },
  ];
  for (const { student, parent } of links) {
    await Guardian.updateOne(
      { studentId: student._id, email: parent.email },
      { $setOnInsert: { ...parent, institutionId: inst._id, studentId: student._id } },
      { upsert: true },
    );
  }
}