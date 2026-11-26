import mongoose, { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../../app';
import { connectDb, disconnectDb } from '../../db/connect';
import { signToken } from '../../middleware/auth';
import { Invite } from '../../models';

// Integration test: runs only when MONGODB_URI_TEST is set (a local MongoDB or the CI service).
const base = process.env.MONGODB_URI_TEST;
const describeDb = base ? describe : describe.skip;

/** Its own database, so it can drop it while other database tests run in parallel. */
function ownDatabase(uri: string): string {
  const url = new URL(uri);
  url.pathname = `${url.pathname.replace(/\/$/, '') || '/school_test'}_a07_invites`;
  return url.toString();
}

const DAY = 86_400_000;

describeDb('GET /api/invites (with a database)', () => {
  jest.setTimeout(60_000);
  const app = createApp();
  const instId = new Types.ObjectId();
  const otherInstId = new Types.ObjectId();
  const managerId = new Types.ObjectId();
  const classId = new Types.ObjectId();
  const studentId = new Types.ObjectId();
  const token = signToken({
    sub: String(managerId),
    institutionId: String(instId),
    roles: ['management'],
  });
  const get = (query = '') =>
    request(app).get(`/api/invites${query}`).set('Authorization', `Bearer ${token}`);

  let n = 0;
  const make = (
    email: string,
    status: string,
    days: number,
    extra: Record<string, unknown> = {},
    institutionId = instId,
  ) =>
    Invite.create({
      institutionId,
      email,
      role: 'teacher',
      status,
      tokenHash: `hash-${n++}`,
      invitedBy: managerId,
      expiresAt: new Date(Date.now() + days * DAY),
      ...extra,
    });

  beforeAll(async () => {
    await connectDb(ownDatabase(base!));
    await mongoose.connection.dropDatabase();
    await Invite.syncIndexes();
    // created one after another, so the newest is the last one
    await make('first@school.example', 'pending', 7, { classIds: [classId] });
    await make('late@school.example', 'pending', -1);
    await make('expired@school.example', 'expired', -2);
    await make('revoked@school.example', 'revoked', 3);
    await make('joined@school.example', 'accepted', 3);
    await make('parent@school.example', 'pending', 5, {
      role: 'parent',
      studentIds: [studentId],
      message: 'ברוכים הבאים',
    });
    await make('other-school@school.example', 'pending', 7, {}, otherInstId);
  });
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectDb();
  });

  it('lists every invite of the institution, newest first, as an InvitePage', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 6, page: 1, size: 25 });
    expect(res.body.items.map((i: { email: string }) => i.email)).toEqual([
      'parent@school.example',
      'joined@school.example',
      'revoked@school.example',
      'expired@school.example',
      'late@school.example',
      'first@school.example',
    ]);
  });

  it('never shows another institution or the token hash', async () => {
    const res = await get();
    const emails = res.body.items.map((i: { email: string }) => i.email);
    expect(emails).not.toContain('other-school@school.example');
    for (const item of res.body.items) expect(item).not.toHaveProperty('tokenHash');
  });

  it('returns each invite in the contract shape', async () => {
    const res = await get('?status=pending');
    const parent = res.body.items.find(
      (i: { email: string }) => i.email === 'parent@school.example',
    );
    expect(parent).toEqual({
      id: expect.any(String),
      email: 'parent@school.example',
      role: 'parent',
      classIds: [],
      studentIds: [String(studentId)],
      message: 'ברוכים הבאים',
      status: 'pending',
      invitedBy: String(managerId),
      createdAt: expect.any(String),
      expiresAt: expect.any(String),
    });
  });

  it('status=pending leaves out invites past their date', async () => {
    const res = await get('?status=pending');
    expect(res.body.total).toBe(2);
    expect(res.body.items.map((i: { email: string }) => i.email).sort()).toEqual([
      'first@school.example',
      'parent@school.example',
    ]);
  });

  it('status=expired includes pending invites past their date', async () => {
    const res = await get('?status=expired');
    expect(res.body.total).toBe(2);
    for (const item of res.body.items) expect(item.status).toBe('expired');
  });

  it.each([
    ['revoked', 'revoked@school.example'],
    ['accepted', 'joined@school.example'],
  ])('status=%s filters to that status', async (status, email) => {
    const res = await get(`?status=${status}`);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].email).toBe(email);
  });

  it('pages the results and keeps the full total', async () => {
    const first = await get('?page=1&size=4');
    const second = await get('?page=2&size=4');
    expect(first.body).toMatchObject({ total: 6, page: 1, size: 4 });
    expect(first.body.items).toHaveLength(4);
    expect(second.body.items).toHaveLength(2);
    const ids = [...first.body.items, ...second.body.items].map((i: { id: string }) => i.id);
    expect(new Set(ids).size).toBe(6);
  });

  it('returns an empty page past the end', async () => {
    const res = await get('?status=pending&page=3&size=25');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], total: 2, page: 3, size: 25 });
  });
});
