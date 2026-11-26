import request from 'supertest';
import { createApp } from '../../app';
import { signToken } from '../../middleware/auth';

const app = createApp();
const token = (roles: Parameters<typeof signToken>[0]['roles']) =>
  signToken({ sub: '64b000000000000000000001', institutionId: '64b000000000000000000002', roles });

describe('GET /api/me/teaching (without a database)', () => {
  it('requires a token', async () => {
    const res = await request(app).get('/api/me/teaching');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('is forbidden to a role without G08', async () => {
    const res = await request(app)
      .get('/api/me/teaching')
      .set('Authorization', `Bearer ${token(['parent'])}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
