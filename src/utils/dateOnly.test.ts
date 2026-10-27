import { DATE_ONLY, addDays, toDateOnly, weekday } from './dateOnly';

describe('dateOnly', () => {
  it('gives the day in Israel, whatever the time zone of the server', () => {
    // 22:30 UTC is already 00:30 the next day in Israel (winter, UTC+2)
    expect(toDateOnly(new Date('2026-01-05T22:30:00Z'))).toBe('2026-01-06');
    expect(toDateOnly(new Date('2026-01-05T21:30:00Z'))).toBe('2026-01-05');
  });

  it('adds days across months and years', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('knows the day of the week', () => {
    expect(weekday('2026-10-27')).toBe(2); // a Tuesday
  });

  it('accepts only the YYYY-MM-DD shape', () => {
    expect(DATE_ONLY.test('2026-10-27')).toBe(true);
    expect(DATE_ONLY.test('2026-10-27T00:00:00Z')).toBe(false);
    expect(DATE_ONLY.test('27/10/2026')).toBe(false);
  });
});
