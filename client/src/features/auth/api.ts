import { apiRequest } from '../../lib/api';
import type { Me, SignupInput } from './types';

export async function fetchMe(token: string): Promise<Me> {
  const data = (await apiRequest('/me', { token })) as { user: Me };
  return data.user;
}

/** True only for a code that can be used right now. The API never says why not. */
export async function validateReferralCode(code: string): Promise<boolean> {
  const data = (await apiRequest('/auth/referral-codes/validate', {
    method: 'POST',
    body: { code },
  })) as { valid: boolean };
  return data.valid;
}

/** Resolves the same way for a new and an already-registered email (by design). */
export async function signup(input: SignupInput): Promise<void> {
  await apiRequest('/auth/signup', { method: 'POST', body: input });
}
