import request from 'supertest';
import { createApp } from '../../app';
import { signToken } from '../../middleware/auth';
import type { RoleKey } from '../../permissions';

const app = createApp();

const tokenFor = (roles: RoleKey[], sub = '64b000000000000000000001') =>
  signToken({
    sub,
    institutionId: '64b000000000000000000002',
    roles,
  });

describe('GET /api/assessments/:id/stats (no database needed)', () => {
  const validAssessmentId = '64b000000000000000000020';

  it('requires a token', async () => {
    const res = await request(app).get(`/api/assessments/${validAssessmentId}/stats`);
    expect(res.status).toBe(401);
  });

  it('returns 400 BAD_ID for an invalid assessment id', async () => {
    const res = await request(app)
      .get('/api/assessments/invalid-id/stats')
      .set('Authorization', `Bearer ${tokenFor(['management'])}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_ID');
  });

  it('is forbidden for a role without access to G05', async () => {
    const res = await request(app)
      .get(`/api/assessments/${validAssessmentId}/stats`)
      .set('Authorization', `Bearer ${tokenFor(['student'])}`);
    expect(res.status).toBe(403);
  });
});
