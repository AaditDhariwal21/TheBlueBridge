import { z } from 'zod';

import { EMAIL_MAX, PASSWORD_LIMITS } from '../../../../shared/limits.ts';
import { applicationFields, checkApplication, clearUnusedOther } from '../users/users.schemas.ts';

/** Supabase hashes with bcrypt, which reads only the first 72 bytes. */
const password = z
  .string({ error: 'Choose a password.' })
  .min(PASSWORD_LIMITS.min, { error: `Use at least ${PASSWORD_LIMITS.min} characters.` })
  .refine((value) => Buffer.byteLength(value, 'utf8') <= PASSWORD_LIMITS.maxBytes, {
    error: `Keep your password under ${PASSWORD_LIMITS.maxBytes} characters.`,
  });

/** Checked by the service; the format is not revealed separately from validity. */
const referralCode = z
  .string({ error: 'Enter your referral code.' })
  .min(1, { error: 'Enter your referral code.' })
  .max(64, { error: 'This referral code is not valid.' });

export const validateReferralCodeBody = z.strictObject({ code: referralCode });

/** The account (email, password), the invitation, and the whole application. */
export const signupBody = z
  .strictObject({
    referralCode,
    email: z
      .string({ error: 'Enter your email address.' })
      .trim()
      .toLowerCase()
      .pipe(z.email({ error: 'Enter a valid email address.' }).max(EMAIL_MAX)),
    password,
    ...applicationFields,
  })
  .superRefine(checkApplication)
  .transform(clearUnusedOther);

export type SignupInput = z.output<typeof signupBody>;
