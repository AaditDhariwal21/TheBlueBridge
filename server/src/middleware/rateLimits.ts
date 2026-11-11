import { rateLimit, type Options } from 'express-rate-limit';

import { AppError } from '../lib/errors.ts';
import { viewerOf } from './authenticate.ts';

/**
 * Per-IP limits, counted in this process's memory. If the API ever runs as more
 * than one instance, give these a shared store (e.g. Redis) so limits hold
 * across instances. Client IPs are only correct when TRUST_PROXY matches the
 * number of proxies in front of the API.
 */

const common: Partial<Options> = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new AppError('RATE_LIMITED', 'Too many requests. Please wait a little and try again.'));
  },
};

/** Every API request: generous, just a flood guard. */
export function apiRateLimit() {
  return rateLimit({ ...common, windowMs: 60_000, limit: 300 });
}

/**
 * Anything that reveals whether a referral code works (validate and signup)
 * shares one tight budget, so codes cannot be guessed through either endpoint.
 */
export function referralAttemptRateLimit() {
  return rateLimit({ ...common, windowMs: 15 * 60_000, limit: 10 });
}

/**
 * Posting blogs, Query Blogs and comments, counted per member (not per IP) so
 * one account can't flood the site. Mount after requireAuth.
 */
export function writeRateLimit() {
  return rateLimit({
    ...common,
    windowMs: 10 * 60_000,
    limit: 30,
    keyGenerator: (req) => 'user:' + viewerOf(req).id,
  });
}
