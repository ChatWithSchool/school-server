import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../app';
import { connectDb, disconnectDb } from '../../db/connect';
import { Assessment, Grade, User } from '../../models';
import { DEMO_PASSWORD, seedCore } from '../../seed/core';
import { stfMail } from '../../seed/names';
import { seedShared } from '../../seed/shared';

// Integration test: runs only when MONGODB_URI_TEST is set (a local MongoDB or the CI service).
// Its own database (<name>_g04): the test files run in parallel, and another file's
// dropDatabase would delete this file's users in the middle of its tests.
const uri = process.env.MONGODB_URI_TEST?.replace(/\/([^/?]+)(\?|$)/, '/$1_g04$2');
const describeDb = uri ? describe : describe.skip;

const FIELDS = [
  'classId',
  'date',
  'gradedCount',
  'groupId',
  'id',
  'subjectId',
  'teacherId',
  'termId',
  'title',
  'type',
  'weight',
];

describeDb('GET /api/assessments (with a database)', () => {
  jest.setTimeout(60_000);
  const app = createApp();

  const login = async (email: string) => {
    const res = await request(app).post('/api/auth/login').send({ email, password: DEMO_PASSWORD });
    expect(res.status).toBe(200);
    return res.body.token as string;
  };
  const get = (token: string, query = '') =>
    request(app).get(`/api/assessments${query}`).set('Authorization', `Bearer ${token}`);

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

  it('gives management every assessment of the institution, as a page', async () => {
    const manager = await login(stfMail(0));
    const res = await get(manager);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['items', 'page', 'size', 'total']);
    expect(res.body.total).toBe(await Assessment.countDocuments());
    expect(res.body).toMatchObject({ page: 1, size: 25 });
    expect(res.body.items).toHaveLength(25);
    expect(Object.keys(res.body.items[0]).sort()).toEqual(FIELDS);
  });

  it('pages through the list', async () => {
    const manager = await login(stfMail(0));
    const total = await Assessment.countDocuments();
    const last = await get(manager, `?page=2&size=${total - 2}`);
    expect(last.body.items).toHaveLength(2);
    expect(last.body).toMatchObject({ page: 2, total });
  });

  it('gives a teacher only her own assessments, with the graded count', async () => {
    const email = stfMail(8); // English in ז1, ז2 and ח1
    const teacher = await login(email);
    const me = await User.findOne({ email }).lean();
    const res = await get(teacher);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(await Assessment.countDocuments({ teacherId: me!._id }));
    for (const a of res.body.items as { id: string; teacherId: string; gradedCount: number }[]) {
      expect(a.teacherId).toBe(String(me!._id));
      expect(a.gradedCount).toBe(
        await Grade.countDocuments({ assessmentId: a.id, score: { $ne: null } }),
      );
    }
  });

  it('is forbidden to a role without G04', async () => {
    const secretary = await login(stfMail(1));
    const res = await get(secretary);
    expect(res.status).toBe(403);
  });
});
