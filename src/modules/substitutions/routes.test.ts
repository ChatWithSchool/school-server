import request from 'supertest';
import { createApp } from '../../app';
import { signToken } from '../../middleware/auth';
import type { RoleKey } from '../../permissions';

const app = createApp();

// A signed token is enough for the permission checks: they only read the roles from it.
const tokenFor = (roles: RoleKey[]) =>
  signToken({
    sub: '000000000000000000000001',
    institutionId: '000000000000000000000002',
    roles,
  });

const URL = '/api/staff/available?date=2026-10-18&slot=1';

describe('GET /api/staff/available', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 403 to a teacher, who has no access to T03', async () => {
    const res = await request(app)
      .get(URL)
      .set('Authorization', `Bearer ${tokenFor(['teacher'])}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 400 for a missing or invalid date and slot', async () => {
    const auth = `Bearer ${tokenFor(['management'])}`;
    const noDate = await request(app).get('/api/staff/available?slot=1').set('Authorization', auth);
    const badDate = await request(app)
      .get('/api/staff/available?date=2026-02-31&slot=1')
      .set('Authorization', auth);
    const badSlot = await request(app)
      .get('/api/staff/available?date=2026-10-18&slot=all')
      .set('Authorization', auth);
    expect(noDate.status).toBe(400);
    expect(badDate.status).toBe(400);
    expect(badSlot.status).toBe(400);
  });
});
