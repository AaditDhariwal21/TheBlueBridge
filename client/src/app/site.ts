/** Site-wide constants. Copy that appears in more than one place lives here. */

export const SITE_NAME = 'The Blue Bridge';

/** Canonical origin without a trailing slash, e.g. "https://example.org". */
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? '').replace(/\/+$/, '');

export const OG_IMAGE = {
  path: '/og-image.jpg',
  alt: 'Two women meeting at the centre of a glowing bridge above the words The Blue Bridge',
} as const;

export const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/community', label: 'Community' },
  { to: '/blogs', label: 'Blogs' },
  { to: '/about', label: 'About' },
] as const;

/**
 * Placeholder destinations. Auth is out of scope for this phase, so these are
 * intentionally empty links. Replace them when sign-in and sign-up exist.
 */
export const PLACEHOLDER_HREF = {
  signIn: '#',
  createAccount: '#',
} as const;

export const COPYRIGHT = '© 2026 The Blue Bridge';

export const MOTTO = ['Connection', 'Community', 'Confluence'] as const;
