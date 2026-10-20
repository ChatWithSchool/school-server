import { createAnnouncementSchema } from './schema';

describe('createAnnouncementSchema', () => {
  it('accepts a valid announcement and fills defaults', () => {
    const r = createAnnouncementSchema.parse({ title: 'ישיבת צוות', body: 'מחר בשעה 8' });
    expect(r.audience).toBe('staff');
    expect(r.pinned).toBe(false);
  });
  it('rejects a missing title or body', () => {
    expect(createAnnouncementSchema.safeParse({ title: '', body: 'x' }).success).toBe(false);
    expect(createAnnouncementSchema.safeParse({ title: 'כותרת', body: '' }).success).toBe(false);
  });
  it('rejects an unknown audience', () => {
    expect(
      createAnnouncementSchema.safeParse({ title: 'כותרת', body: 'x', audience: 'parents' })
        .success,
    ).toBe(false);
  });
});
