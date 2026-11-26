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

const ASSESSMENT_GRADES_URL = '/api/assessments/64b000000000000000000003/grades';

describe('GET /api/assessments/:id/grades (without a database)', () => {
  it('requires a token', async () => {
    const res = await request(app).get(ASSESSMENT_GRADES_URL);
    expect(res.status).toBe(401);
  });

  it('rejects a role without access to G01', async () => {
    const res = await request(app)
      .get(ASSESSMENT_GRADES_URL)
      .set('Authorization', `Bearer ${tokenFor(['parent'])}`);
    expect(res.status).toBe(403);
  });

  it('rejects an invalid assessment id with the uniform error format', async () => {
    const res = await request(app)
      .get('/api/assessments/abc/grades')
      .set('Authorization', `Bearer ${tokenFor(['management'])}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_ID');
  });
});

describe('GET /api/students/:id/grades (no database needed)', () => {
  const validStudentId = '64b000000000000000000010';

  it('requires a token', async () => {
    const res = await request(app).get(`/api/students/${validStudentId}/grades`);
    expect(res.status).toBe(401);
  });

  it('returns 400 BAD_ID for an invalid student id', async () => {
    const res = await request(app)
      .get('/api/students/invalid-id/grades')
      .set('Authorization', `Bearer ${tokenFor(['management'])}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_ID');
  });

  it('returns 400 BAD_ID for an invalid term query param', async () => {
    const res = await request(app)
      .get(`/api/students/${validStudentId}/grades?term=invalid-term`)
      .set('Authorization', `Bearer ${tokenFor(['management'])}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_ID');
  });

  it('is forbidden for a role without access to G02', async () => {
    const res = await request(app)
      .get(`/api/students/${validStudentId}/grades`)
      .set('Authorization', `Bearer ${tokenFor(['secretary'])}`);
    expect(res.status).toBe(403);
  });
});
