import { isIP } from 'node:net';

import { ipKeyGenerator, rateLimit, type Options } from 'express-rate-limit';

import type { ClientIpHeader } from '../config/env.ts';
import { AppError } from '../lib/errors.ts';
import { viewerOf } from './authenticate.ts';

/**
 * Per-IP limits, counted in this process's memory. If the API ever runs as more
 * than one instance, give these a shared store (e.g. Redis) so limits hold
 * across instances.
 */

interface IpSource {
  ip?: string | undefined;
  get(name: string): string | undefined;
}

/**
 * The key per-IP limits count by. Behind Cloudflare the visitor's IP comes from
 * `clientIpHeader` (Cloudflare overwrites it and rejects requests that try to set
 * it); otherwise from req.ip, which follows TRUST_PROXY. IPv6 addresses are grouped
 * by /56 so one household can't rotate through its whole range.
 */
export function clientIpKey(clientIpHeader: ClientIpHeader | null): (req: IpSource) => string {
  return (req) => {
    const fromEdge = clientIpHeader === null ? undefined : req.get(clientIpHeader)?.trim();
    const ip = fromEdge !== undefined && isIP(fromEdge) !== 0 ? fromEdge : req.ip;
    return ipKeyGenerator(ip ?? 'unknown');
  };
}

const common: Partial<Options> = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new AppError('RATE_LIMITED', 'Too many requests. Please wait a little and try again.'));
  },
};

/** Every API request: generous, just a flood guard. */
export function apiRateLimit(clientIpHeader: ClientIpHeader | null) {
  return rateLimit({
    ...common,
    windowMs: 60_000,
    limit: 300,
    keyGenerator: clientIpKey(clientIpHeader),
  });
}

/**
 * Anything that reveals whether a referral code works (validate and signup)
 * shares one tight budget, so codes cannot be guessed through either endpoint.
 */
export function referralAttemptRateLimit(clientIpHeader: ClientIpHeader | null) {
  return rateLimit({
    ...common,
    windowMs: 15 * 60_000,
    limit: 10,
    keyGenerator: clientIpKey(clientIpHeader),
  });
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

/**
 * The admin panel, counted per admin: tighter than the general limit, enough for
 * search-as-you-type over the member list. Mount after requireAuth.
 */
export function adminRateLimit() {
  return rateLimit({
    ...common,
    windowMs: 60_000,
    limit: 60,
    keyGenerator: (req) => 'admin:' + viewerOf(req).id,
  });
}

/**
 * Search-as-you-type and filtering on a list (the Feed, the member directory). Typing sends a
 * request per pause, so each list gets its own per-IP budget, counted only for requests that
 * carry one of `params`; plain paging is not counted here.
 */
export function searchRateLimit(clientIpHeader: ClientIpHeader | null, params: readonly string[]) {
  return rateLimit({
    ...common,
    windowMs: 60_000,
    limit: 60,
    keyGenerator: clientIpKey(clientIpHeader),
    skip: (req) => params.every((param) => req.query[param] === undefined),
  });
}
