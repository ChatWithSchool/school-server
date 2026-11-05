import { createSubjectSchema, updateAssignmentSchema } from './schema';

describe('I06 request schemas', () => {
  it('normalizes a valid subject and its grades', () => {
    expect(
      createSubjectSchema.parse({ name: '  מדעים  ', code: ' sci ', grades: [' ז ', 'ח'] }),
    ).toEqual({ name: 'מדעים', code: 'sci', grades: ['ז', 'ח'] });
  });

  it('rejects short subject names and non-ascii codes', () => {
    expect(createSubjectSchema.safeParse({ name: 'א', code: 'SCI', grades: ['ז'] }).success).toBe(
      false,
    );
    expect(
      createSubjectSchema.safeParse({ name: 'מדעים', code: 'קוד בעברית', grades: ['ז'] }).success,
    ).toBe(false);
  });

  it('accepts either a teacher id or null to clear a class-subject assignment', () => {
    const ids = { subjectId: '64b000000000000000000001' };
    expect(
      updateAssignmentSchema.safeParse({ ...ids, teacherId: '64b000000000000000000002' }).success,
    ).toBe(true);
    expect(updateAssignmentSchema.safeParse({ ...ids, teacherId: null }).success).toBe(true);
    expect(updateAssignmentSchema.safeParse({ ...ids, teacherId: '' }).success).toBe(false);
  });
});
