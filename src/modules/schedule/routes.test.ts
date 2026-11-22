import request from 'supertest';
import { createApp } from '../../app';
import { signToken } from '../../middleware/auth';
import type { RoleKey } from '../../permissions';

const app = createApp();
const tokenFor = (roles: RoleKey[]) =>
  signToken({ sub: '64b000000000000000000001', institutionId: '64b000000000000000000002', roles });

describe('GET /api/schedule/template authorization', () => {
  it('requires authentication', async () => {
    const response = await request(app).get('/api/schedule/template');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('denies roles without T04 access', async () => {
    const response = await request(app)
      .get('/api/schedule/template')
      .set('Authorization', `Bearer ${tokenFor(['teacher'])}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
