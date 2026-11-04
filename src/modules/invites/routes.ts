import { Router } from 'express';

/**
 * A07 · inviting users and pending invites. The screen has no collection of its own: it reads
 * Invite, User and Role from the core (`import { Invite, User, Role } from '../../models'`).
 * Server A: GET /invites. Server B: POST /invites and DELETE /invites/:id (writes to invites).
 */
const router = Router();

export default router;
