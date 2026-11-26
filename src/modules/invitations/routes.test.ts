import request from 'supertest';
import { createApp } from '../../app';
import { hashToken, previewStatus } from './routes';

const app = createApp();
const NOW = new Date('2026-11-24T08:00:00Z');
const LATER = new Date('2026-11-30T08:00:00Z');
const EARLIER = new Date('2026-11-20T08:00:00Z');

describe('previewStatus', () => {
  it('is valid for a pending invite that has not expired', () => {
    expect(previewStatus({ status: 'pending', expiresAt: LATER }, NOW)).toBe('valid');
  });

  it('is expired for a pending invite past its date', () => {
    expect(previewStatus({ status: 'pending', expiresAt: EARLIER }, NOW)).toBe('expired');
  });

  it('is expired for an invite marked expired or revoked', () => {
    expect(previewStatus({ status: 'expired', expiresAt: LATER }, NOW)).toBe('expired');
    expect(previewStatus({ status: 'revoked', expiresAt: LATER }, NOW)).toBe('expired');
  });

  it('is used once the invite was accepted, even before its date', () => {
    expect(previewStatus({ status: 'accepted', expiresAt: LATER }, NOW)).toBe('used');
  });
});

describe('hashToken', () => {
  it('hashes the same way the seed stores tokens (sha256 hex)', () => {
    expect(hashToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('GET /api/invites/:token (no database needed)', () => {
  it('does not ask for sign-in, and rejects a token that is too long', async () => {
    const res = await request(app).get(`/api/invites/${'a'.repeat(300)}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('keeps the other module routes behind sign-in', async () => {
    const res = await request(app).get('/api/announcements');
    expect(res.status).toBe(401);
  });
});
