import cors from 'cors';
import express, { Router, type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';

import type { ServerConfig } from './config/env.ts';
import type { Db } from './db/schema.ts';
import { adminRoutes } from './features/admin/admin.routes.ts';
import { authRoutes } from './features/auth/auth.routes.ts';
import { blogsRoutes } from './features/blogs/blogs.routes.ts';
import { categoriesRoutes } from './features/categories/categories.routes.ts';
import { commentsRoutes } from './features/comments/comments.routes.ts';
import { healthRoutes } from './features/health/health.routes.ts';
import { membersRoutes } from './features/members/members.routes.ts';
import { referralsRoutes } from './features/referrals/referrals.routes.ts';
import { usersRoutes } from './features/users/users.routes.ts';
import type { AccessTokenVerifier } from './lib/accessToken.ts';
import type { IdentityProvider } from './lib/identity.ts';
import { requireAuth } from './middleware/authenticate.ts';
import { errorHandler, notFound } from './middleware/errorHandler.ts';
import { apiRateLimit, writeRateLimit } from './middleware/rateLimits.ts';
import { requestContext } from './middleware/requestContext.ts';

/** Everything the app needs from the outside, injected so tests can swap any of it. */
export interface AppDeps extends Pick<
  ServerConfig,
  'trustProxy' | 'clientIpHeader' | 'corsOrigins'
> {
  logger: Logger;
  db: Db;
  identity: IdentityProvider;
  verifyAccessToken: AccessTokenVerifier;
}

const BODY_LIMIT = '16kb';
/** A formatted blog is bigger than anything else (up to ~100 kB of document JSON). */
const BLOG_BODY_LIMIT = '256kb';

export function createApp(deps: AppDeps): Express {
  const app = express();
  app.set('trust proxy', deps.trustProxy);

  app.use(requestContext(deps.logger));
  app.use(helmet());
  // Bearer tokens, not cookies, so no credentials mode. Unknown origins get no CORS headers.
  app.use(
    cors({
      origin: deps.corsOrigins,
      methods: ['GET', 'POST', 'DELETE'],
      allowedHeaders: ['Authorization', 'Content-Type'],
      maxAge: 600,
    }),
  );
  // Parsed once: the blog route's larger limit runs first, the general parser then skips.
  app.post('/api/blogs', express.json({ limit: BLOG_BODY_LIMIT }));
  app.use(express.json({ limit: BODY_LIMIT }));

  app.use('/api', apiRouter(deps));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

/** The route table. Every path below is served under /api. */
function apiRouter(deps: AppDeps): Router {
  const withAuth = { ...deps, requireAuth: requireAuth(deps), limitWrites: writeRateLimit() };
  const router = Router();
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store'); // responses carry personal data
    next();
  });
  router.use(apiRateLimit(deps.clientIpHeader));

  router.use(healthRoutes()); //                     GET  /health
  router.use(categoriesRoutes(deps)); //             GET  /categories
  router.use('/auth', authRoutes(deps)); //          POST /auth/signup, /auth/referral-codes/validate
  router.use(usersRoutes(withAuth)); //              GET  /me
  router.use(membersRoutes(withAuth)); //            GET  /members[/:id], /users/:id
  router.use(referralsRoutes(withAuth)); //          GET  /me/referrals
  router.use(blogsRoutes(withAuth)); //              /blogs[/:id], /query-blogs[/:id], /me/blogs
  router.use(commentsRoutes(withAuth)); //           /blogs/:id/comments[/:commentId], /me/comments
  router.use('/admin', adminRoutes(withAuth)); //    /admin/* (approved admins only)
  return router;
}
