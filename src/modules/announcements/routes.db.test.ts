import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../app';
import { connectDb, disconnectDb } from '../../db/connect';
import { DEMO_PASSWORD, seedCore } from '../../seed/core';
import { stfMail } from '../../seed/names';

// Integration test: runs only when MONGODB_URI_TEST is set (a local MongoDB or the CI service).
const uri = process.env.MONGODB_URI_TEST;
const describeDb = uri ? describe : describe.skip;

describeDb('announcements API (with a database)', () => {
  jest.setTimeout(60_000);
  const app = createApp();
  let manager = '';
  let teacher = '';

  const login = async (email: string) => {
    const res = await request(app).post('/api/auth/login').send({ email, password: DEMO_PASSWORD });
    expect(res.status).toBe(200);
    return res.body.token as string;
  };

  beforeAll(async () => {
    await connectDb(uri);
    await mongoose.connection.dropDatabase();
    await seedCore();
    manager = await login(stfMail(0));
    teacher = await login(stfMail(8));
  });
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectDb();
  });

  it('lets management create and list announcements, and the teacher read them', async () => {
    const created = await request(app)
      .post('/api/announcements')
      .set('Authorization', `Bearer ${manager}`)
      .send({ title: 'בדיקה', body: 'תוכן הבדיקה' });
    expect(created.status).toBe(201);
    const list = await request(app)
      .get('/api/announcements')
      .set('Authorization', `Bearer ${teacher}`);
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0].read).toBe(false);
    const read = await request(app)
      .post(`/api/announcements/${created.body.id}/read`)
      .set('Authorization', `Bearer ${teacher}`);
    expect(read.status).toBe(204);
    const again = await request(app)
      .get('/api/announcements')
      .set('Authorization', `Bearer ${teacher}`);
    expect(again.body.items[0].read).toBe(true);
  });

  it('rejects a wrong password with the same message as an unknown user', async () => {
    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ email: stfMail(0), password: 'wrong-password' });
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@school.example', password: 'x' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it('returns the user and permissions on /me', async () => {
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${teacher}`);
    expect(me.status).toBe(200);
    expect(me.body.permissions.S03).toBe('scoped');
    expect(me.body.landing).toBe('T06');
  });
});
