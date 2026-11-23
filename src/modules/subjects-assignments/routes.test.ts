import request from 'supertest';
import { createApp } from '../../app';
import { signToken } from '../../middleware/auth';
import * as permissions from '../../permissions';
import type { RoleKey } from '../../permissions';

const app = createApp();
const tokenFor = (roles: RoleKey[]) =>
  signToken({ sub: '64b000000000000000000001', institutionId: '64b000000000000000000002', roles });

describe('subjects route permissions', () => {
  it('requires authentication to list subjects', async () => {
    const response = await request(app).get('/api/subjects');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects users without I06 access from reading or creating subjects', async () => {
    const token = tokenFor(['teacher']);
    const list = await request(app).get('/api/subjects').set('Authorization', `Bearer ${token}`);
    const create = await request(app)
      .post('/api/subjects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'מתמטיקה', code: 'MATH', grades: ['ז'] });

    expect(list.status).toBe(403);
    expect(create.status).toBe(403);
  });

  it('returns READ_ONLY when I06 access is simulated as read', async () => {
    const levelFor = jest.spyOn(permissions, 'levelFor').mockReturnValue('read');
    try {
      const response = await request(app)
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenFor(['management'])}`)
        .send({ name: 'פיזיקה', code: 'PHY' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('READ_ONLY');
    } finally {
      levelFor.mockRestore();
    }
  });

  it('returns the standard validation error body for invalid subject input', async () => {
    const response = await request(app)
      .post('/api/subjects')
      .set('Authorization', `Bearer ${tokenFor(['management'])}`)
      .send({ name: '', code: '' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('הנתונים שנשלחו אינם תקינים');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'name' }),
        expect.objectContaining({ field: 'code' }),
      ]),
    );
    expect(Object.keys(response.body.error)).toEqual(['code', 'message', 'details']);
  });
});
