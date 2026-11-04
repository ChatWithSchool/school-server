import { Router } from 'express';

/**
 * A02 · joining by invite. The screen has no collection of its own: it reads Invite and User
 * from the core (`import { Invite, User } from '../../models'`).
 * Server A: GET /invites/:token. Server B: POST /invites/:token/accept.
 */
const router = Router();

export default router;
