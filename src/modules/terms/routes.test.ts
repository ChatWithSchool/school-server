import request from 'supertest';
import { createApp } from '../../app';
import { signToken } from '../../middleware/auth';
import type { RoleKey } from '../../permissions';

const app = createApp();
const tokenFor = (roles: RoleKey[]) =>
  signToken({ sub: '64b000000000000000000001', institutionId: '64b000000000000000000002', roles });

describe('GET /api/terms (no database needed)', () => {
  it('requires a token', async () => {
    const res = await request(app).get('/api/terms');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('is forbidden for a role without access to I03', async () => {
    const res = await request(app)
      .get('/api/terms')
      .set('Authorization', `Bearer ${tokenFor(['secretary'])}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
