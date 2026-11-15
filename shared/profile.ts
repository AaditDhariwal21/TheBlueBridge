import { NOT_APPLICABLE, PROFILE_LIMITS, passYearRange } from './limits.ts';

/** Normalization rules for application answers, applied the same way by client and server. */

/** "na", "N/A" and "NA" all mean not applicable. */
export function isNotApplicable(value: string): boolean {
  return /^n\s*\/?\s*a$/i.test(value.trim());
}

/** A pass-out year typed or sent as text or a number: the year, or null if it isn't one. */
export function parsePassYear(value: unknown, now?: Date): number | null {
  const year =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d{4}$/.test(value.trim())
        ? Number(value.trim())
        : Number.NaN;
  const { min, max } = passYearRange(now);
  return Number.isInteger(year) && year >= min && year <= max ? year : null;
}

/** The college pass-out year as stored: a year such as "2012", or "NA". Null if neither. */
export function parseCollegePassYear(value: unknown, now?: Date): string | null {
  if (typeof value === 'string' && isNotApplicable(value)) return NOT_APPLICABLE;
  const year = parsePassYear(value, now);
  return year === null ? null : String(year);
}

/**
 * A LinkedIn profile link in canonical form ("https://www.linkedin.com/in/name"), or null if
 * it isn't one. Accepts the link without "https://". Only linkedin.com and its subdomains,
 * without credentials or a port, so the directory never links anywhere else.
 */
export function normalizeLinkedInUrl(value: string): string | null {
  const text = value.trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  const host = url.hostname;
  const isLinkedIn = host === 'linkedin.com' || host.endsWith('.linkedin.com');
  if (!['https:', 'http:'].includes(url.protocol) || !isLinkedIn) return null;
  if (url.username !== '' || url.password !== '' || url.port !== '') return null;
  url.protocol = 'https:';
  url.hash = '';
  return url.href.length <= PROFILE_LIMITS.linkedinUrlMax ? url.href : null;
}
