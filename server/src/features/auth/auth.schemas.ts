import { z } from 'zod';

import { singleLineText } from '../../lib/validation.ts';

/** Spaces, hyphens, dots and brackets are dropped; the rest must be E.164. */
const phoneNumber = z
  .string({ error: 'Enter your phone number.' })
  .transform((value) => value.replace(/[\s().-]/g, ''))
  .pipe(
    z.string().regex(/^\+[1-9][0-9]{7,14}$/, {
      error: 'Enter your number with its country code, like +91 98765 43210.',
    }),
  );

/** Supabase hashes with bcrypt, which reads only the first 72 bytes. */
const password = z
  .string({ error: 'Choose a password.' })
  .min(10, { error: 'Use at least 10 characters.' })
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, {
    error: 'Keep your password under 72 characters.',
  });

/** Checked by the service; the format is not revealed separately from validity. */
const referralCode = z
  .string({ error: 'Enter your referral code.' })
  .min(1, { error: 'Enter your referral code.' })
  .max(64, { error: 'This referral code is not valid.' });

export const validateReferralCodeBody = z.strictObject({ code: referralCode });

export const signupBody = z
  .strictObject({
    referralCode,
    email: z
      .string({ error: 'Enter your email address.' })
      .trim()
      .toLowerCase()
      .pipe(z.email({ error: 'Enter a valid email address.' }).max(254)),
    password,
    name: singleLineText(1, 100, 'Enter your name.'),
    phoneNumber,
    occupation: singleLineText(1, 100, 'Enter your occupation.'),
    appliedRole: z.enum(['member', 'ambassador'], { error: 'Choose member or ambassador.' }),
    categoryIds: z
      .array(z.uuid({ error: 'Choose categories from the list.' }))
      .max(2)
      .default([]),
  })
  .superRefine((input, ctx) => {
    const issue = (message: string) => {
      ctx.addIssue({ code: 'custom', path: ['categoryIds'], message });
    };
    if (input.appliedRole === 'ambassador' && input.categoryIds.length === 0) {
      issue('Choose one or two categories.');
    }
    if (input.appliedRole === 'member' && input.categoryIds.length > 0) {
      issue('Only ambassadors choose categories.');
    }
    if (new Set(input.categoryIds).size !== input.categoryIds.length) {
      issue('Choose two different categories.');
    }
  });

export type SignupInput = z.output<typeof signupBody>;
