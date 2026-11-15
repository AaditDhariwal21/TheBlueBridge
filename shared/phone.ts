import {
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
} from 'libphonenumber-js';

/**
 * Mobile numbers, validated by libphonenumber-js on both sides and stored in E.164
 * ("+919876543210"). Kept apart from limits.ts so pages that don't edit phone numbers never
 * load the library.
 */

/** The number in E.164 when it is a valid number, otherwise null. Accepts any punctuation. */
export function toE164(input: string, country?: string): string | null {
  const text = input.trim();
  if (text === '') return null;
  const region = country !== undefined && isSupportedCountry(country) ? country : undefined;
  const parsed = parsePhoneNumberFromString(text, region);
  return parsed?.isValid() ? parsed.number : null;
}

/** Splits a stored E.164 number into its country and national number, for editing. */
export function splitE164(e164: string): { country: string; national: string } | null {
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed?.country) return null;
  return { country: parsed.country, national: parsed.nationalNumber };
}

/** "+91", for a country the library knows; null otherwise. */
export function callingCodeOf(country: string): string | null {
  return isSupportedCountry(country) ? `+${getCountryCallingCode(country)}` : null;
}

/** "+91 98765 43210", for display. Falls back to the stored text. */
export function formatPhone(e164: string): string {
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;
}
