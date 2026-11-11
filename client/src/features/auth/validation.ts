import type { AppliedRole } from './types';

/**
 * Client-side checks mirror server/src/features/auth/auth.schemas.ts. They are
 * for quick feedback only; the server validates everything again.
 */

export const NAME_MAX = 100;
export const OCCUPATION_MAX = 100;
export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 10;
export const MAX_CATEGORIES = 2;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164 = /^\+[1-9][0-9]{7,14}$/;
const REFERRAL_CODE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{10}$/;

/** One message for unknown, malformed-on-the-server and no-longer-valid codes. */
export const INVALID_CODE_MESSAGE =
  'This code isn’t valid. Please check it with the member who invited you.';

export function normalizeReferralCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '');
}

export function isWellFormedReferralCode(code: string): boolean {
  return REFERRAL_CODE.test(code);
}

/** "ABCDE23456" → "ABCDE-23456", easier to read aloud and copy. */
export function formatReferralCode(code: string): string {
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

export interface SignupDetails {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  occupation: string;
  appliedRole: AppliedRole | '';
  categoryIds: string[];
}

export type DetailsErrors = Partial<Record<keyof SignupDetails, string>>;

export function validateDetails(raw: SignupDetails): {
  values: SignupDetails;
  errors: DetailsErrors;
} {
  const values: SignupDetails = {
    ...raw,
    name: collapse(raw.name),
    email: raw.email.trim().toLowerCase(),
    phoneNumber: raw.phoneNumber.replace(/[\s().-]/g, ''),
    occupation: collapse(raw.occupation),
    categoryIds: raw.appliedRole === 'ambassador' ? raw.categoryIds : [],
  };
  const errors: DetailsErrors = {};

  if (!values.name) errors.name = 'Enter your name.';
  else if (values.name.length > NAME_MAX) errors.name = `Keep this under ${NAME_MAX} characters.`;

  if (!values.email) errors.email = 'Enter your email address.';
  else if (values.email.length > EMAIL_MAX || !EMAIL.test(values.email))
    errors.email = 'Enter a valid email address, like name@example.com.';

  if (values.password.length < PASSWORD_MIN)
    errors.password = `Use at least ${PASSWORD_MIN} characters.`;
  else if (new TextEncoder().encode(values.password).length > 72)
    errors.password = 'Keep your password under 72 characters.';

  if (!values.phoneNumber) errors.phoneNumber = 'Enter your phone number.';
  else if (!E164.test(values.phoneNumber))
    errors.phoneNumber = 'Enter your number with its country code, like +91 98765 43210.';

  if (!values.occupation) errors.occupation = 'Enter your occupation.';
  else if (values.occupation.length > OCCUPATION_MAX)
    errors.occupation = `Keep this under ${OCCUPATION_MAX} characters.`;

  if (!values.appliedRole) errors.appliedRole = 'Choose how you would like to join.';
  else if (values.appliedRole === 'ambassador' && values.categoryIds.length === 0)
    errors.categoryIds = 'Choose one or two categories.';

  return { values, errors };
}

function collapse(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
