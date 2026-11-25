import request from 'supertest';
import { createApp } from '../../app';
import { signToken } from '../../middleware/auth';
import type { RoleKey } from '../../permissions';

// No database needed: every case below is answered before the first query.
const app = createApp();
const token = (roles: RoleKey[]) =>
  signToken({ sub: '64b000000000000000000001', institutionId: '64b000000000000000000002', roles });
const ID = '64b000000000000000000003';

describe('/students/:id/notes (without a database)', () => {
  it('401 without a token', async () => {
    const res = await request(app).get(`/api/students/${ID}/notes`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it.each<RoleKey>(['parent', 'student', 'secretary'])('403 for the %s role (not in the matrix)', async (role) => {
    const get = await request(app)
      .get(`/api/students/${ID}/notes`)
      .set('Authorization', `Bearer ${token([role])}`);
    expect(get.status).toBe(403);
    expect(get.body.error.code).toBe('FORBIDDEN');
    const post = await request(app)
      .post(`/api/students/${ID}/notes`)
      .set('Authorization', `Bearer ${token([role])}`)
      .send({ kind: 'positive', description: 'x' });
    expect(post.status).toBe(403);
  });

  it('400 BAD_ID for an id that is not an ObjectId', async () => {
    const res = await request(app)
      .get('/api/students/123/notes')
      .set('Authorization', `Bearer ${token(['management'])}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_ID');
  });

  it('400 VALIDATION_ERROR with the field names for a bad query', async () => {
    const res = await request(app)
      .get(`/api/students/${ID}/notes?size=500&sort=author`)
      .set('Authorization', `Bearer ${token(['teacher'])}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['size', 'sort']));
  });

  it('400 VALIDATION_ERROR for a note without a kind and a description', async () => {
    const res = await request(app)
      .post(`/api/students/${ID}/notes`)
      .set('Authorization', `Bearer ${token(['homeroom'])}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['kind', 'description']));
  });
});
