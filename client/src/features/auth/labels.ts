import type { Role, Status } from './types';

/** How roles and account statuses read in the UI. */
export const ROLE_LABELS: Record<Role, string> = {
  member: 'Member',
  ambassador: 'Ambassador',
  admin: 'Admin',
};

export const STATUS_LABELS: Record<Status, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
};
