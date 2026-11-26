import request from 'supertest';
import { createApp } from '../../app';
import { signToken } from '../../middleware/auth';
import type { RoleKey } from '../../permissions';
import { effectiveStatus, listInvitesQuerySchema, statusFilter } from './routes';

const app = createApp();
const tokenFor = (roles: RoleKey[]) =>
  signToken({ sub: '64b000000000000000000001', institutionId: '64b000000000000000000002', roles });

const NOW = new Date('2026-11-24T08:00:00Z');
const LATER = new Date('2026-11-30T08:00:00Z');
const EARLIER = new Date('2026-11-20T08:00:00Z');

describe('effectiveStatus', () => {
  it('keeps a pending invite that has not expired', () => {
    expect(effectiveStatus({ status: 'pending', expiresAt: LATER }, NOW)).toBe('pending');
  });

  it('shows a pending invite past its date as expired', () => {
    expect(effectiveStatus({ status: 'pending', expiresAt: EARLIER }, NOW)).toBe('expired');
  });

  it('keeps accepted, revoked and expired as they are', () => {
    expect(effectiveStatus({ status: 'accepted', expiresAt: EARLIER }, NOW)).toBe('accepted');
    expect(effectiveStatus({ status: 'revoked', expiresAt: LATER }, NOW)).toBe('revoked');
    expect(effectiveStatus({ status: 'expired', expiresAt: LATER }, NOW)).toBe('expired');
  });
});

describe('statusFilter', () => {
  it('leaves out pending invites past their date', () => {
    expect(statusFilter('pending', NOW)).toEqual({ status: 'pending', expiresAt: { $gt: NOW } });
  });

  it('counts pending invites past their date as expired', () => {
    expect(statusFilter('expired', NOW)).toEqual({
      $or: [{ status: 'expired' }, { status: 'pending', expiresAt: { $lte: NOW } }],
    });
  });

  it('filters the other statuses as they are, and nothing without a status', () => {
    expect(statusFilter('revoked', NOW)).toEqual({ status: 'revoked' });
    expect(statusFilter(undefined, NOW)).toEqual({});
  });
});

describe('listInvitesQuerySchema', () => {
  it('defaults to the first page of 25', () => {
    expect(listInvitesQuerySchema.parse({})).toEqual({ page: 1, size: 25 });
  });

  it('rejects an unknown status', () => {
    expect(listInvitesQuerySchema.safeParse({ status: 'old' }).success).toBe(false);
  });
});

describe('GET /api/invites (no database needed)', () => {
  it('requires a token', async () => {
    const res = await request(app).get('/api/invites');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it.each<RoleKey[]>([['secretary'], ['teacher'], ['parent']])(
    'is forbidden for %s',
    async (role) => {
      const res = await request(app)
        .get('/api/invites')
        .set('Authorization', `Bearer ${tokenFor([role])}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    },
  );

  it('rejects an unknown status with 400', async () => {
    const res = await request(app)
      .get('/api/invites?status=old')
      .set('Authorization', `Bearer ${tokenFor(['management'])}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a page size over 100 with 400', async () => {
    const res = await request(app)
      .get('/api/invites?size=500')
      .set('Authorization', `Bearer ${tokenFor(['management'])}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
