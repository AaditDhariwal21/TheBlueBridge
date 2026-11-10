/**
 * Waitlist input rules. Client-side validation is for user feedback only;
 * the server must validate again when a real backend replaces the stub.
 */

export interface WaitlistInput {
  name: string;
  email: string;
}

export type WaitlistErrors = Partial<Record<keyof WaitlistInput, string>>;

export const NAME_MAX = 100;
export const EMAIL_MAX = 254;

/** Pragmatic shape check (one "@", a dot in the domain, no spaces). */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trims, collapses internal whitespace in the name, and validates. */
export function validateWaitlist(raw: WaitlistInput): {
  values: WaitlistInput;
  errors: WaitlistErrors;
} {
  const values: WaitlistInput = {
    name: raw.name.trim().replace(/\s+/g, ' '),
    email: raw.email.trim(),
  };
  const errors: WaitlistErrors = {};

  if (!values.name) errors.name = 'Please enter your name.';
  else if (values.name.length > NAME_MAX)
    errors.name = `Please keep your name under ${NAME_MAX} characters.`;

  if (!values.email) errors.email = 'Please enter your email address.';
  else if (values.email.length > EMAIL_MAX || !EMAIL_PATTERN.test(values.email))
    errors.email = 'Please enter a valid email address, like name@example.com.';

  return { values, errors };
}
