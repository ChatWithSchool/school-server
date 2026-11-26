import request from 'supertest';
import { createApp } from '../../app';
import { signToken } from '../../middleware/auth';

const app = createApp();
const token = (roles: Parameters<typeof signToken>[0]['roles']) =>
  signToken({ sub: '64b000000000000000000001', institutionId: '64b000000000000000000002', roles });

const URL = '/api/grades/64b000000000000000000003/history';

describe('GET /api/grades/:id/history (without a database)', () => {
  it('requires a token', async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(401);
  });

  it('rejects a role without access to G03', async () => {
    const res = await request(app).get(URL).set('Authorization', `Bearer ${token(['parent'])}`);
    expect(res.status).toBe(403);
  });

  it('rejects an invalid grade id', async () => {
    const res = await request(app)
      .get('/api/grades/abc/history')
      .set('Authorization', `Bearer ${token(['management'])}`);
    expect(res.status).toBe(400);
  });
});