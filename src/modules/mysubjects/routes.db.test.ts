import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../app';
import { connectDb, disconnectDb } from '../../db/connect';
import { SchoolClass, Subject } from '../../models';
import { DEMO_PASSWORD, seedCore } from '../../seed/core';
import { stfMail } from '../../seed/names';
import { seedShared } from '../../seed/shared';

// Integration test: runs only when MONGODB_URI_TEST is set (a local MongoDB or the CI service).
const uri = process.env.MONGODB_URI_TEST;
const describeDb = uri ? describe : describe.skip;

describeDb('GET /api/me/teaching (with a database)', () => {
  jest.setTimeout(60_000);
  const app = createApp();

  const login = async (email: string) => {
    const res = await request(app).post('/api/auth/login').send({ email, password: DEMO_PASSWORD });
    expect(res.status).toBe(200);
    return res.body.token as string;
  };

  beforeAll(async () => {
    await connectDb(uri);
    await mongoose.connection.dropDatabase();
    await seedCore();
    await seedShared();
  });
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectDb();
  });

  it('returns one card per class and subject of the teacher, in the contract shape', async () => {
    const teacher = await login(stfMail(8)); // English in ז1, ז2 and ח1
    const res = await request(app)
      .get('/api/me/teaching')
      .set('Authorization', `Bearer ${teacher}`);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body)).toEqual(['items']);

    const classes = await SchoolClass.find().lean();
    const english = await Subject.findOne({ name: 'אנגלית' }).lean();
    const nameOf = (id: string) => classes.find((c) => String(c._id) === id)?.name;
    const cards: Record<string, Record<string, unknown>> = Object.fromEntries(
      (res.body.items as Record<string, unknown>[]).map((c) => [nameOf(c.classId as string), c]),
    );
    expect(Object.keys(cards).sort()).toEqual(['ז1', 'ז2', 'ח1']);
    for (const card of Object.values(cards)) {
      expect(Object.keys(card).sort()).toEqual([
        'classId',
        'openAssessments',
        'studentsWithoutGrade',
        'subjectId',
      ]);
      expect(card.subjectId).toBe(String(english!._id));
    }
    // from the shared seed: some grades are not entered yet (score null)
    expect(cards['ז1']).toMatchObject({ openAssessments: 2, studentsWithoutGrade: 2 });
    expect(cards['ז2']).toMatchObject({ openAssessments: 0, studentsWithoutGrade: 0 });
    expect(cards['ח1']).toMatchObject({ openAssessments: 3, studentsWithoutGrade: 3 });
  });

  it('is forbidden to management (no G08 in the permission matrix)', async () => {
    const manager = await login(stfMail(0));
    const res = await request(app)
      .get('/api/me/teaching')
      .set('Authorization', `Bearer ${manager}`);
    expect(res.status).toBe(403);
  });
});
