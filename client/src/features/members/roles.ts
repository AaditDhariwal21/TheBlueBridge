import type { Role } from '../auth/types';

/** The sections a members list is grouped into, in the API's order. */
export const ROLE_SECTIONS: readonly { role: Role; title: string }[] = [
  { role: 'admin', title: 'Admins' },
  { role: 'ambassador', title: 'Ambassadors' },
  { role: 'member', title: 'Members' },
];
