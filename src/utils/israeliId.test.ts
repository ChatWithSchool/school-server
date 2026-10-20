import { isValidIsraeliId } from './israeliId';

describe('isValidIsraeliId', () => {
  it('accepts valid numbers', () => {
    expect(isValidIsraeliId('123456782')).toBe(true);
    expect(isValidIsraeliId('000000018')).toBe(true);
  });
  it('rejects numbers shorter than five digits', () => {
    expect(isValidIsraeliId('18')).toBe(false);
  });
  it('rejects a wrong check digit and non-digits', () => {
    expect(isValidIsraeliId('123456789')).toBe(false);
    expect(isValidIsraeliId('12345678a')).toBe(false);
    expect(isValidIsraeliId('')).toBe(false);
  });
});
