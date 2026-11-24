import mongoose, { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../../app';
import { connectDb, disconnectDb } from '../../db/connect';
import { Institution, Invite } from '../../models';
import { hashToken } from './routes';

// Integration test: runs only when MONGODB_URI_TEST is set (a local MongoDB or the CI service).
const base = process.env.MONGODB_URI_TEST;
const describeDb = base ? describe : describe.skip;

/** Its own database, so it can drop it while other database tests run in parallel. */
function ownDatabase(uri: string): string {
  const url = new URL(uri);
  url.pathname = `${url.pathname.replace(/\/$/, '') || '/school_test'}_a02_invites`;
  return url.toString();
}

const DAY = 86_400_000;

describeDb('GET /api/invites/:token (with a database)', () => {
  jest.setTimeout(60_000);
  const app = createApp();

  const tokens = {
    valid: 'token-valid',
    pastDate: 'token-past-date',
    expired: 'token-expired',
    revoked: 'token-revoked',
    accepted: 'token-accepted',
  };

  beforeAll(async () => {
    await connectDb(ownDatabase(base!));
    await mongoose.connection.dropDatabase();
    const inst = await Institution.create({ name: 'תיכון הדוגמה' });
    const invitedBy = new Types.ObjectId();
    const make = (token: string, email: string, status: string, days: number) =>
      Invite.create({
        institutionId: inst._id,
        email,
        role: 'teacher',
        status,
        tokenHash: hashToken(token),
        invitedBy,
        expiresAt: new Date(Date.now() + days * DAY),
      });
    await make(tokens.valid, 'New.Teacher@School.Example', 'pending', 7);
    await make(tokens.pastDate, 'late@school.example', 'pending', -1);
    await make(tokens.expired, 'expired@school.example', 'expired', -2);
    await make(tokens.revoked, 'revoked@school.example', 'revoked', 3);
    await make(tokens.accepted, 'joined@school.example', 'accepted', 3);
  });
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectDb();
  });

  it('returns the invite preview without sign-in', async () => {
    const res = await request(app).get(`/api/invites/${tokens.valid}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      institutionName: 'תיכון הדוגמה',
      role: 'teacher',
      email: 'new.teacher@school.example',
      status: 'valid',
    });
  });

  it('never returns the token hash or internal ids', async () => {
    const res = await request(app).get(`/api/invites/${tokens.valid}`);
    expect(res.body).not.toHaveProperty('tokenHash');
    expect(res.body).not.toHaveProperty('institutionId');
    expect(res.body).not.toHaveProperty('invitedBy');
  });

  it.each([
    [tokens.pastDate, 'expired'],
    [tokens.expired, 'expired'],
    [tokens.revoked, 'expired'],
    [tokens.accepted, 'used'],
  ])('reports %s as %s', async (token, status) => {
    const res = await request(app).get(`/api/invites/${token}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe(status);
  });

  it('returns 404 for an unknown token', async () => {
    const res = await request(app).get('/api/invites/no-such-token');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
