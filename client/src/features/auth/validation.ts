/** Referral codes, as typed and shown. The API decides whether a code is valid. */

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
