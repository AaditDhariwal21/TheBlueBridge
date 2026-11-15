import type { Logger } from 'pino';

import type { Db } from '../../db/schema.ts';
import { invalidReferralCodeError, validationError } from '../../lib/errors.ts';
import type { IdentityProvider } from '../../lib/identity.ts';
import { findUsableReferralCodeId, issueReferralCode } from '../referrals/referrals.service.ts';
import { checkApplicationAnswers, createProfile } from '../users/users.service.ts';
import type { SignupInput } from './auth.schemas.ts';

export interface SignupDeps {
  db: Db;
  identity: IdentityProvider;
  logger: Logger;
}

export async function isReferralCodeUsable(db: Db, code: string): Promise<boolean> {
  return (await findUsableReferralCodeId(db, code)) !== undefined;
}

/**
 * 1. Check the referral code, categories and option answers before anything is created.
 * 2. Create the Supabase Auth user (email pre-confirmed: admin approval is the check).
 * 3. In one transaction: re-check the code under a lock, insert the pending
 *    profile and categories, and issue the user's own referral code.
 * 4. If step 3 fails, delete the Auth user so nothing is left half-created.
 *
 * An email that is already registered gets the same answer as a successful
 * signup and creates nothing, so the endpoint cannot be used to find out who
 * has an account.
 */
export async function signup(deps: SignupDeps, input: SignupInput): Promise<void> {
  const { db, identity } = deps;

  if (!(await isReferralCodeUsable(db, input.referralCode))) throw invalidReferralCodeError();
  const answers = await checkApplicationAnswers(db, input);

  const created = await identity.createUser({ email: input.email, password: input.password });
  if (!created.ok) {
    if (created.reason === 'weak_password') {
      throw validationError({ password: 'Choose a stronger password.' });
    }
    return;
  }

  try {
    await db.transaction().execute(async (trx) => {
      const referralCodeId = await findUsableReferralCodeId(trx, input.referralCode, {
        lockOwner: true,
      });
      if (referralCodeId === undefined) throw invalidReferralCodeError();

      await createProfile(
        trx,
        { userId: created.userId, referralCodeId, application: input },
        answers,
      );
      await issueReferralCode(trx, created.userId);
    });
  } catch (error) {
    await deleteIdentity(deps, created.userId);
    throw error;
  }
}

async function deleteIdentity({ identity, logger }: SignupDeps, userId: string): Promise<void> {
  try {
    await identity.deleteUser(userId);
  } catch (error) {
    logger.error(
      { err: error, userId },
      'Signup rollback could not delete the Supabase Auth user. Delete it in the dashboard.',
    );
  }
}
