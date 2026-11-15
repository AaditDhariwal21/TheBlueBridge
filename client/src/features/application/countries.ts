import { COUNTRY_CODES } from '../../../../shared/countries';

const names = new Intl.DisplayNames(['en'], { type: 'region' });

/** "IN" → "India". Falls back to the code. */
export function countryName(code: string): string {
  try {
    return names.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Every ISO country, by name, for the Country question. */
export const COUNTRY_OPTIONS: readonly { code: string; name: string }[] = COUNTRY_CODES.map(
  (code) => ({ code, name: countryName(code) }),
).sort((a, b) => a.name.localeCompare(b.name, 'en'));
