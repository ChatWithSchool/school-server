import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../app';
import { connectDb, disconnectDb } from '../../db/connect';
import { DEMO_PASSWORD, seedCore } from '../../seed/core';
import { stfMail } from '../../seed/names';
import { Student } from '../../models/student.model';
import { User } from '../../models/user.model';
import { getScopedClassIds } from '../../services/scope';

// Integration test: runs only when MONGODB_URI_TEST is set (a local MongoDB or the CI service).
const uri = process.env.MONGODB_URI_TEST;
const describeDb = uri ? describe : describe.skip;

describeDb('GET /api/students/:id/grades scoped access (with a database)', () => {
  jest.setTimeout(60_000);
  const app = createApp();
  let teacher = '';
  let teacherUserId = '';
  let inScopeStudentId = '';
  let outOfScopeStudentId = '';

  const login = async (email: string) => {
    const res = await request(app).post('/api/auth/login').send({ email, password: DEMO_PASSWORD });
    expect(res.status).toBe(200);
    return res.body.token as string;
  };

  const getGrades = (studentId: string) =>
    request(app).get(`/api/students/${studentId}/grades`).set('Authorization', `Bearer ${teacher}`);

  beforeAll(async () => {
    await connectDb(uri);
    await mongoose.connection.dropDatabase();
    await seedCore();
    teacher = await login(stfMail(8));

    const user = await User.findOne({ email: stfMail(8) }).lean();
    teacherUserId = String(user!._id);

    const scoped = (await getScopedClassIds(teacherUserId)).map(String);
    const students = await Student.find({ deletedAt: null }).lean();
    inScopeStudentId = String(
      students.find((s) => s.classId && scoped.includes(String(s.classId)))!._id,
    );
    outOfScopeStudentId = String(
      students.find((s) => s.classId && !scoped.includes(String(s.classId)))!._id,
    );
  });
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectDb();
  });

  it('lets a teacher read grades of a student in their class', async () => {
    const res = await getGrades(inScopeStudentId);
    expect(res.status).toBe(200);
    expect(res.body.studentId).toBe(inScopeStudentId);
  });

  it('forbids a teacher from reading a student outside their classes', async () => {
    const res = await getGrades(outOfScopeStudentId);
    expect(res.status).toBe(403);
  });

  it('lets a user read their own grades through Student.userId', async () => {
    // The student is outside the teacher's classes, so only isSelf can allow this.
    await Student.updateOne({ _id: outOfScopeStudentId }, { userId: teacherUserId });
    const res = await getGrades(outOfScopeStudentId);
    expect(res.status).toBe(200);
  });
});
