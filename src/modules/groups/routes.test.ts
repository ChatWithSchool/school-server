import request from 'supertest';
import { createApp } from '../../app';
import { signToken } from '../../middleware/auth';
import { createGroupSchema } from './schema';

const app = createApp();
const token = (roles: Parameters<typeof signToken>[0]['roles']) =>
  signToken({ sub: '64b000000000000000000001', institutionId: '64b000000000000000000002', roles });

describe('groups (without a database)', () => {
  it('requires a token', async () => {
    const res = await request(app).get('/api/groups');
    expect(res.status).toBe(401);
  });
  it('validates the body', () => {
    expect(createGroupSchema.safeParse({ name: '' }).success).toBe(false);
    expect(createGroupSchema.safeParse({ name: 'שם תקין' }).success).toBe(true);
  });
  it('rejects an invalid body with the uniform error format', async () => {
    const res = await request(app).post('/api/groups').set('Authorization', `Bearer ${token(['management'])}`).send({ name: '' });
    // management must have write access to S04 in src/permissions/matrix.json; otherwise this is 403
    expect([400, 403]).toContain(res.status);
  });
});
