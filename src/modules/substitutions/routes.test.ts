import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../../app';
import { signToken } from '../../middleware/auth';
import type { RoleKey } from '../../permissions';

// No database needed: 401, 403 and 400 are decided before any query runs.
const app = createApp();

const tokenFor = (role: RoleKey) =>
  signToken({
    sub: new Types.ObjectId().toString(),
    institutionId: new Types.ObjectId().toString(),
    roles: [role],
  });

describe('GET /api/me/today (authorization)', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/me/today');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 401 for an invalid token', async () => {
    const res = await request(app).get('/api/me/today').set('Authorization', 'Bearer not-a-token');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it.each(['management', 'secretary', 'parent'] as const)('returns 403 for %s', async (role) => {
    const res = await request(app)
      .get('/api/me/today')
      .set('Authorization', `Bearer ${tokenFor(role)}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('GET /api/staff/available', () => {
  const URL = '/api/staff/available?date=2026-10-18&slot=1';

  it('returns 401 without a token', async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 403 to a teacher, who has no access to T03', async () => {
    const res = await request(app).get(URL).set('Authorization', `Bearer ${tokenFor('teacher')}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 400 for a missing or invalid date and slot', async () => {
    const auth = `Bearer ${tokenFor('management')}`;
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