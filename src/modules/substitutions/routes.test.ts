import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../../app';
import { signToken } from '../../middleware/auth';

// No database needed: 401 and 403 are decided before the query runs.
describe('GET /api/me/today (authorization)', () => {
  const app = createApp();
  const tokenFor = (role: 'management' | 'secretary' | 'parent') =>
    signToken({
      sub: new Types.ObjectId().toString(),
      institutionId: new Types.ObjectId().toString(),
      roles: [role],
    });

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