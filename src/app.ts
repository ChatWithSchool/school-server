import cors from 'cors';
import express, { Router, type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { requireAuth } from './middleware/auth';
import { errorHandler, notFound } from './middleware/errorHandler';
import { authRouter } from './routes/auth.routes';
import { mountModules } from './routes/loader';

export function createApp(): Express {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', env: env.NODE_ENV });
  });
  app.use('/api/auth', authRouter);

  // every module route below needs a signed-in user; each route adds authorize('<screen>') itself
  const protectedRouter = Router();
  protectedRouter.use(requireAuth);
  mountModules(app, [protectedRouter]);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
