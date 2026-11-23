import { createSubjectSchema } from './schema';

describe('subject schemas', () => {
  it('trims and validates subject input', () => {
    expect(
      createSubjectSchema.parse({ name: ' מתמטיקה ', code: ' math ', grades: ['ז'] }),
    ).toEqual({ name: 'מתמטיקה', code: 'math', grades: ['ז'] });
  });

  it('defaults missing grades to an empty list', () => {
    expect(createSubjectSchema.parse({ name: 'מתמטיקה', code: 'MATH' })).toEqual({
      name: 'מתמטיקה',
      code: 'MATH',
      grades: [],
    });
  });

  it('requires a subject name and code', () => {
    expect(createSubjectSchema.safeParse({ name: '', code: 'MATH', grades: ['ז'] }).success).toBe(
      false,
    );
    expect(
      createSubjectSchema.safeParse({ name: 'מתמטיקה', grades: [] }).success,
    ).toBe(false);
  });
});
