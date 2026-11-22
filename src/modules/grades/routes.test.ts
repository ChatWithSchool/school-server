import request from 'supertest';
import { createApp } from '../../app';
import { signToken } from '../../middleware/auth';

const app = createApp();
const token = (roles: Parameters<typeof signToken>[0]['roles']) =>
  signToken({ sub: '64b000000000000000000001', institutionId: '64b000000000000000000002', roles });

const URL = '/api/assessments/64b000000000000000000003/grades';

describe('GET /api/assessments/:id/grades (without a database)', () => {
  it('requires a token', async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(401);
  });

  it('rejects a role without access to G01', async () => {
    const res = await request(app).get(URL).set('Authorization', `Bearer ${token(['parent'])}`);
    expect(res.status).toBe(403);
  });

  it('rejects an invalid assessment id with the uniform error format', async () => {
    const res = await request(app)
      .get('/api/assessments/abc/grades')
      .set('Authorization', `Bearer ${token(['management'])}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_ID');
  });
});