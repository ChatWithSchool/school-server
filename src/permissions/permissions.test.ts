import { landingFor, levelFor, permissionsFor } from './index';

describe('permission matrix', () => {
  it('gives management full access to the users screen', () => {
    expect(levelFor(['management'], 'A04')).toBe('full');
  });
  it('gives a teacher scoped access to student cards and none to user management', () => {
    expect(levelFor(['teacher'], 'S03')).toBe('scoped');
    expect(levelFor(['teacher'], 'A04')).toBeNull();
  });
  it('takes the strongest level across several roles', () => {
    expect(levelFor(['teacher', 'secretary'], 'S02')).toBe('full');
    expect(levelFor(['teacher', 'homeroom'], 'S03')).toBe('scoped');
  });
  it('returns null for an unknown screen', () => {
    expect(levelFor(['management'], 'Z99')).toBeNull();
  });
  it('lists permissions for the client', () => {
    const p = permissionsFor(['parent']);
    expect(p.S03).toBe('scoped');
    expect(p.A04).toBeUndefined();
  });
  it('routes each role to its landing screen', () => {
    expect(landingFor(['management'])).toBe('X03');
    expect(landingFor(['teacher'])).toBe('T06');
    expect(landingFor(['parent'])).toBe('S03');
    expect(landingFor([])).toBe('X02');
  });
});
