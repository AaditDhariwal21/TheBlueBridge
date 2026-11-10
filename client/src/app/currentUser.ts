/**
 * The mock signed-in member. Auth is out of scope for this phase, so this one
 * hard-coded identity is attached to everything posted in the session.
 * It carries no role or permissions. Replace with the real session user later.
 */
export const CURRENT_USER = {
  id: 'u-current',
  name: 'Aditi Vyas',
  profession: 'Product Manager',
  initials: 'AV',
} as const;
