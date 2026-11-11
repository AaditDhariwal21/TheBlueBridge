import type { Me } from './types';

export const AUTH_PATHS = {
  signIn: '/sign-in',
  signUp: '/sign-up',
  account: '/account',
} as const;

/** A same-site path from ?next=, or null. Blocks open redirects ("//evil.com", "https:..."). */
export function safeNextPath(value: string | null): string | null {
  if (!value?.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  return value;
}

/** Where to go after signing in: approved members carry on, everyone else sees their status. */
export function destinationAfterSignIn(me: Me, next: string | null): string {
  return me.status === 'approved' ? (next ?? '/blogs') : AUTH_PATHS.account;
}

export function signInPathFor(returnTo: string): string {
  return `${AUTH_PATHS.signIn}?next=${encodeURIComponent(returnTo)}`;
}
