import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../../app';
import { connectDb, disconnectDb } from '../../db/connect';
import { Subject } from '../../models';
import { DEMO_PASSWORD, seedCore } from '../../seed/core';
import { stfMail } from '../../seed/names';

const uri = process.env.MONGODB_URI_TEST;

describe('subjects API (with a database)', () => {
  jest.setTimeout(60_000);
  const app = createApp();
  let manager = '';
  let memoryServer: MongoMemoryServer | undefined;

  const login = async (email: string) => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password: DEMO_PASSWORD });
    expect(response.status).toBe(200);
    return response.body.token as string;
  };

  beforeAll(async () => {
    const connectionUri = uri?.trim() || (memoryServer = await MongoMemoryServer.create()).getUri();
    await connectDb(connectionUri);
    await mongoose.connection.dropDatabase();
    await seedCore();
    manager = await login(stfMail(0));
  });

  afterAll(async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
        await disconnectDb();
      }
    } finally {
      await memoryServer?.stop();
    }
  });

  it('paginates the subject result', async () => {
    const response = await request(app)
      .get('/api/subjects?page=1&size=1')
      .set('Authorization', `Bearer ${manager}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ total: 8, page: 1, size: 1 });
    expect(response.body.items).toHaveLength(1);
  });

  it('creates a subject with empty grades when grades are omitted', async () => {
    const created = await request(app)
      .post('/api/subjects')
      .set('Authorization', `Bearer ${manager}`)
      .send({ name: 'פיזיקה', code: 'PHY' });

    expect(created.status).toBe(201);
    expect(created.body.id).toEqual(expect.any(String));
    const subject = await Subject.findById(created.body.id).lean();
    expect(subject?.grades).toEqual([]);
  });

  it('returns the specified validation error for a duplicate code', async () => {
    const duplicate = await request(app)
      .post('/api/subjects')
      .set('Authorization', `Bearer ${manager}`)
      .send({ name: 'מקצוע אחר', code: 'MATH' });

    expect(duplicate.status).toBe(400);
    expect(duplicate.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'הנתונים שנשלחו אינם תקינים',
        details: [{ field: 'code', message: 'הקוד כבר קיים במוסד' }],
      },
    });
  });

  it('rejects a duplicate subject name with a validation error', async () => {
    const duplicate = await request(app)
      .post('/api/subjects')
      .set('Authorization', `Bearer ${manager}`)
      .send({ name: 'מתמטיקה', code: 'MATH2' });

    expect(duplicate.status).toBe(400);
    expect(duplicate.body.error.code).toBe('VALIDATION_ERROR');
    expect(duplicate.body.error.details).toEqual([
      { field: 'name', message: 'המקצוע כבר קיים במוסד' },
    ]);
  });
});
