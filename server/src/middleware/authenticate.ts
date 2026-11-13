import type { Request, RequestHandler } from 'express';

import type { Db } from '../db/schema.ts';
import { getPrincipal } from '../features/users/users.service.ts';
import type { AccessTokenVerifier } from '../lib/accessToken.ts';
import { AppError } from '../lib/errors.ts';
import { canUseAdminPanel, isApproved, type Actor } from '../policies/permissions.ts';

/** The signed-in caller: the profile's id, role and status, plus the token's email. */
export interface Viewer extends Actor {
  readonly email: string | null;
}

const BEARER = /^Bearer ([A-Za-z0-9._~+/=-]+)$/;

/**
 * Requires a valid Supabase access token whose user has a profile row, and
 * attaches that profile to `req.viewer`. The profile is read on every request,
 * so a status change (approval, suspension) takes effect immediately rather
 * than when the token expires.
 */
export function requireAuth(deps: {
  db: Db;
  verifyAccessToken: AccessTokenVerifier;
}): RequestHandler {
  return async (req, _res, next) => {
    const token = BEARER.exec(req.headers.authorization ?? '')?.[1];
    if (token === undefined) throw unauthenticated();

    const claims = await deps.verifyAccessToken(token);
    if (!claims) throw unauthenticated();

    const principal = await getPrincipal(deps.db, claims.userId);
    if (!principal) throw unauthenticated();

    req.viewer = { ...principal, email: claims.email };
    next();
  };
}

/** After requireAuth: only approved accounts get through. */
export const requireApproved: RequestHandler = (req, _res, next) => {
  if (!isApproved(viewerOf(req))) {
    throw new AppError('ACCOUNT_NOT_APPROVED', 'Your account is waiting for approval.');
  }
  next();
};

/**
 * After requireAuth: approved admins only. Every /api/admin route runs this on every
 * request; hiding the panel in the UI is only a convenience.
 */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!canUseAdminPanel(viewerOf(req))) {
    throw new AppError('FORBIDDEN', 'Only admins can do this.');
  }
  next();
};

/** The viewer set by requireAuth. Throws if a route forgot to mount it. */
export function viewerOf(req: Request): Viewer {
  if (!req.viewer) throw new Error('requireAuth must run before this handler');
  return req.viewer;
}

function unauthenticated(): AppError {
  return new AppError('UNAUTHENTICATED', 'Sign in to continue.');
}
