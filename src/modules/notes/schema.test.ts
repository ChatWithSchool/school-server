import { createNoteSchema, listNotesQuerySchema } from './schema';

describe('createNoteSchema', () => {
  it('accepts a valid note and fills the defaults', () => {
    const r = createNoteSchema.parse({ kind: 'positive', description: 'עזר לחבר' });
    expect(r.severity).toBe('');
    expect(r.visibleToParent).toBe(false);
    expect(r.date).toBeUndefined();
  });
  it('requires a known kind and a description', () => {
    expect(createNoteSchema.safeParse({ description: 'x' }).success).toBe(false);
    expect(createNoteSchema.safeParse({ kind: 'bad', description: 'x' }).success).toBe(false);
    expect(createNoteSchema.safeParse({ kind: 'other', description: '   ' }).success).toBe(false);
  });
  it('rejects a bad or future date', () => {
    expect(
      createNoteSchema.safeParse({ kind: 'other', description: 'x', date: '2026-13-40' }).success,
    ).toBe(false);
    expect(
      createNoteSchema.safeParse({ kind: 'other', description: 'x', date: '2999-01-01' }).success,
    ).toBe(false);
    expect(
      createNoteSchema.safeParse({ kind: 'other', description: 'x', date: '2026-10-01' }).success,
    ).toBe(true);
  });
});

describe('listNotesQuerySchema', () => {
  it('uses the defaults: page 1, size 25, newest first', () => {
    const q = listNotesQuerySchema.parse({});
    expect(q).toMatchObject({ page: 1, size: 25, sort: '-date' });
  });
  it('parses the filters', () => {
    const q = listNotesQuerySchema.parse({
      kind: 'discipline',
      from: '2026-09-01',
      to: '2026-10-31',
      visibleToParent: 'true',
      sort: 'kind',
      size: '10',
    });
    expect(q.visibleToParent).toBe(true);
    expect(q.size).toBe(10);
  });
  it('rejects a size above 100, an unknown sort and an inverted range', () => {
    expect(listNotesQuerySchema.safeParse({ size: '500' }).success).toBe(false);
    expect(listNotesQuerySchema.safeParse({ sort: 'author' }).success).toBe(false);
    expect(listNotesQuerySchema.safeParse({ from: '2026-10-31', to: '2026-09-01' }).success).toBe(
      false,
    );
  });
});
