import type { ApplicationDetails } from '../application/types';
import type { Role } from '../auth/types';
import type { Category } from '../categories/types';

/** A directory row (GET /api/members). */
export interface MemberSummary {
  id: string;
  name: string;
  occupation: string;
  role: Role;
  avatarUrl: string | null;
}

/** A member's full profile (GET /api/members/:id), application answers included. */
export interface MemberProfile extends MemberSummary, ApplicationDetails {
  /** An ambassador's categories; empty for everyone else. */
  categories: Category[];
  phoneNumber: string;
  email: string | null;
  joinedAt: string;
}
