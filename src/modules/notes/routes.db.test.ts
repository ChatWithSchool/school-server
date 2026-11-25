import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../app';
import { connectDb, disconnectDb } from '../../db/connect';
import { SchoolClass, Student } from '../../models';
import { DEMO_PASSWORD, seedCore } from '../../seed/core';
import { stfMail } from '../../seed/names';

// Integration test: runs only when MONGODB_URI_TEST is set (a local MongoDB or the CI service).
const uri = process.env.MONGODB_URI_TEST;
const describeDb = uri ? describe : describe.skip;

describeDb('student notes API (with a database)', () => {
  jest.setTimeout(60_000);
  const app = createApp();
  let manager = '';
  let homeroomH3 = ''; // homeroom teacher of class ח3 (staff #4)
  let secretary = '';
  let studentH3 = '';
  let studentH1 = '';

  const login = async (email: string) => {
    const res = await request(app).post('/api/auth/login').send({ email, password: DEMO_PASSWORD });
    expect(res.status).toBe(200);
    return res.body.token as string;
  };
  const idOfClassStudent = async (className: string) => {
    const cls = await SchoolClass.findOne({ name: className });
    const s = await Student.findOne({ classId: cls!._id }).sort({ nationalId: 1 });
    return String(s!._id);
  };

  beforeAll(async () => {
    await connectDb(uri);
    await mongoose.connection.dropDatabase();
    await seedCore();
    manager = await login(stfMail(0));
    secretary = await login(stfMail(1));
    homeroomH3 = await login(stfMail(4));
    studentH3 = await idOfClassStudent('ח3');
    studentH1 = await idOfClassStudent('ח1');
  });
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectDb();
  });

  const post = (token: string, studentId: string, body: object) =>
    request(app)
      .post(`/api/students/${studentId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  const list = (token: string, studentId: string, qs = '') =>
    request(app)
      .get(`/api/students/${studentId}/notes${qs}`)
      .set('Authorization', `Bearer ${token}`);

  it('creates a note with the author and the date, and lists it in the contract shape', async () => {
    const created = await post(homeroomH3, studentH3, {
      kind: 'discipline',
      severity: 'בינונית',
      description: 'אי-קיום כללי הכיתה',
      date: '2026-10-14',
    });
    expect(created.status).toBe(201);
    expect(typeof created.body.id).toBe('string');

    const res = await list(homeroomH3, studentH3);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 1, page: 1, size: 25 });
    expect(res.body.items[0]).toMatchObject({
      id: created.body.id,
      studentId: studentH3,
      date: '2026-10-14',
      kind: 'discipline',
      severity: 'בינונית',
      description: 'אי-קיום כללי הכיתה',
      visibleToParent: false,
    });
    expect(res.body.items[0].authorName).toBeTruthy(); // every note carries its author
  });

  it('defaults the date to today and the severity to an empty string', async () => {
    const created = await post(manager, studentH3, { kind: 'positive', description: 'עזר לחבר' });
    expect(created.status).toBe(201);
    const res = await list(manager, studentH3, '?kind=positive');
    expect(res.body.items[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.body.items[0].severity).toBe('');
  });

  it('paginates, sorts and filters', async () => {
    await post(manager, studentH3, { kind: 'other', description: 'ישנה', date: '2026-09-01' });
    const all = await list(manager, studentH3);
    expect(all.body.total).toBe(3);

    const page1 = await list(manager, studentH3, '?size=2&page=1');
    const page2 = await list(manager, studentH3, '?size=2&page=2');
    expect(page1.body.items).toHaveLength(2);
    expect(page2.body.items).toHaveLength(1);

    const asc = await list(manager, studentH3, '?sort=date');
    expect(asc.body.items[0].description).toBe('ישנה');
    const desc = await list(manager, studentH3);
    expect(desc.body.items[0].description).not.toBe('ישנה');

    const onlyDiscipline = await list(manager, studentH3, '?kind=discipline');
    expect(onlyDiscipline.body.total).toBe(1);
    const range = await list(manager, studentH3, '?from=2026-10-01&to=2026-10-31');
    expect(range.body.items.every((n: { date: string }) => n.date >= '2026-10-01')).toBe(true);
  });

  it('a scoped teacher reaches only students of their own class (same 403 as a missing student)', async () => {
    const other = await list(homeroomH3, studentH1);
    expect(other.status).toBe(403);
    expect(other.body.error.code).toBe('FORBIDDEN');
    const missing = await list(homeroomH3, '64b0000000000000000000ff');
    expect(missing.status).toBe(403);
    expect(missing.body.error.message).toBe(other.body.error.message);
    const writeOther = await post(homeroomH3, studentH1, { kind: 'other', description: 'x' });
    expect(writeOther.status).toBe(403);
  });

  it('management gets 404 for a student that does not exist, and the secretary 403', async () => {
    const missing = await list(manager, '64b0000000000000000000ff');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
    const sec = await list(secretary, studentH3);
    expect(sec.status).toBe(403);
  });

  it('returns VALIDATION_ERROR details in Hebrew for a bad note', async () => {
    const res = await post(manager, studentH3, { kind: 'bad', description: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const messages = res.body.error.details.map((d: { message: string }) => d.message);
    expect(messages).toEqual(expect.arrayContaining(['יש לבחור סוג הערה', 'חובה תיאור']));
  });
});
