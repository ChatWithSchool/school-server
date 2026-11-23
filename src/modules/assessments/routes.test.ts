import request from 'supertest';
import { createApp } from '../../app';
import { signToken } from '../../middleware/auth';

const app = createApp();
const token = (roles: Parameters<typeof signToken>[0]['roles']) =>
  signToken({ sub: '64b000000000000000000001', institutionId: '64b000000000000000000002', roles });

describe('GET /api/assessments (without a database)', () => {
  it('requires a token', async () => {
    const res = await request(app).get('/api/assessments');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('is forbidden to a role without G04', async () => {
    const res = await request(app)
      .get('/api/assessments')
      .set('Authorization', `Bearer ${token(['parent'])}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects an invalid page size with the uniform error format', async () => {
    const res = await request(app)
      .get('/api/assessments?size=1000')
      .set('Authorization', `Bearer ${token(['management'])}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
