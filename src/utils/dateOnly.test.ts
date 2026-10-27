import { DATE_ONLY, toDateOnly } from './dateOnly';

describe('dateOnly', () => {
  it('formats the local calendar day with zero padding', () => {
    expect(toDateOnly(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });

  it('accepts only YYYY-MM-DD', () => {
    expect(DATE_ONLY.test('2026-10-27')).toBe(true);
    expect(DATE_ONLY.test('2026-10-27T00:00:00Z')).toBe(false);
    expect(DATE_ONLY.test('27/10/2026')).toBe(false);
  });
});
