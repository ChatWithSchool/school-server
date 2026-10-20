import request from 'supertest';
import { createApp } from './app';
import { signToken } from './middleware/auth';
import type { RoleKey } from './permissions';

const app = createApp();
const tokenFor = (roles: RoleKey[]) =>
  signToken({ sub: '64b000000000000000000001', institutionId: '64b000000000000000000002', roles });

describe('API basics (no database needed)', () => {
  it('answers the health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('rejects a protected route without a token', async () => {
    const res = await request(app).get('/api/announcements');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects an invalid token', async () => {
    const res = await request(app)
      .get('/api/announcements')
      .set('Authorization', 'Bearer not-a-token');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns 403 when the role has no access to the screen', async () => {
    const res = await request(app)
      .get('/api/announcements')
      .set('Authorization', `Bearer ${tokenFor(['parent'])}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 READ_ONLY when a read-only role tries to write', async () => {
    const res = await request(app)
      .post('/api/announcements')
      .set('Authorization', `Bearer ${tokenFor(['teacher'])}`)
      .send({ title: 'כותרת', body: 'תוכן' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('READ_ONLY');
  });

  it('returns a uniform validation error for a bad body', async () => {
    const res = await request(app)
      .post('/api/announcements')
      .set('Authorization', `Bearer ${tokenFor(['management'])}`)
      .send({ title: '', body: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('validates the login body before touching the database', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 in the uniform format for an unknown route', async () => {
    const res = await request(app)
      .get('/api/nothing-here')
      .set('Authorization', `Bearer ${tokenFor(['management'])}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
