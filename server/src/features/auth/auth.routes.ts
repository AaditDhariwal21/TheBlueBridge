import { Router } from 'express';

import type { Db } from '../../db/schema.ts';
import type { IdentityProvider } from '../../lib/identity.ts';
import { referralAttemptRateLimit } from '../../middleware/rateLimits.ts';
import { signupHandler, validateReferralCodeHandler } from './auth.handlers.ts';

/**
 * Mounted at /auth. Sign-in itself happens in the browser with supabase-js;
 * the API only verifies the resulting access token (middleware/authenticate.ts).
 */
export function authRoutes(deps: { db: Db; identity: IdentityProvider }): Router {
  const router = Router();
  const referralAttempts = referralAttemptRateLimit();
  router.post('/referral-codes/validate', referralAttempts, validateReferralCodeHandler(deps));
  router.post('/signup', referralAttempts, signupHandler(deps));
  return router;
}
