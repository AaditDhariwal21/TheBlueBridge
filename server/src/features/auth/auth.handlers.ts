import type { RequestHandler } from 'express';

import type { Db } from '../../db/schema.ts';
import type { IdentityProvider } from '../../lib/identity.ts';
import { parseInput } from '../../lib/validation.ts';
import { signupBody, validateReferralCodeBody } from './auth.schemas.ts';
import { isReferralCodeUsable, signup } from './auth.service.ts';

/** 202 for every accepted request, including an already-registered email. */
export function signupHandler(deps: { db: Db; identity: IdentityProvider }): RequestHandler {
  return async (req, res) => {
    const input = parseInput(signupBody, req.body);
    await signup({ ...deps, logger: req.log }, input);
    res.status(202).json({ status: 'received' });
  };
}

/** Always 200 with a bare boolean: no hint about why a code is not valid. */
export function validateReferralCodeHandler(deps: { db: Db }): RequestHandler {
  return async (req, res) => {
    const { code } = parseInput(validateReferralCodeBody, req.body);
    res.json({ valid: await isReferralCodeUsable(deps.db, code) });
  };
}
