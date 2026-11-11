import { randomInt } from 'node:crypto';

/**
 * Referral codes: 10 characters from a 31-symbol alphabet with no look-alikes
 * (no 0/O, 1/I/L), about 49.5 bits of cryptographic randomness. The database
 * check constraint (referral_codes_code_check) uses the same alphabet.
 */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const LENGTH = 10;

const PATTERN = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{10}$/;

export function generateReferralCode(): string {
  let code = '';
  // randomInt is uniform (no modulo bias).
  for (let i = 0; i < LENGTH; i++) code += ALPHABET.charAt(randomInt(ALPHABET.length));
  return code;
}

/** Accepts what people type: any case, with spaces or hyphens ("abcde-fghjk"). */
export function normalizeReferralCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '');
}

export function isWellFormedReferralCode(code: string): boolean {
  return PATTERN.test(code);
}
