import request from 'supertest';
import { createApp } from '../../app';
import { signToken } from '../../middleware/auth';

const app = createApp();
const token = (roles: Parameters<typeof signToken>[0]['roles']) =>
  signToken({ sub: '64b000000000000000000001', institutionId: '64b000000000000000000002', roles });

describe('GET /api/students/check-duplicate (without a database)', () => {
  it('requires a token', async () => {
    const res = await request(app).get('/api/students/check-duplicate');
    expect(res.status).toBe(401);
  });

  it('is forbidden for a role without access to S02', async () => {
    const res = await request(app)
      .get('/api/students/check-duplicate')
      .set('Authorization', `Bearer ${token(['parent'])}`);
    expect(res.status).toBe(403);
  });
});