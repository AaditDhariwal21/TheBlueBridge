import type { ApplicationDetails, ApplicationInput } from '../application/types';
import type { Category } from '../categories/types';

/** Shapes returned by the API (server/src/features/*). */

export type Role = 'member' | 'ambassador' | 'admin';
export type Status = 'pending' | 'approved' | 'rejected' | 'suspended';
export type AppliedRole = Extract<Role, 'member' | 'ambassador'>;

/** GET /api/me */
export interface Me extends ApplicationDetails {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string;
  occupation: string;
  role: Role;
  status: Status;
  avatarUrl: string | null;
  /** An ambassador's 1 to 3 categories; empty for members and admins. */
  categories: Category[];
  referralCode: string | null;
  /**
   * The team's note on the latest decision about her application, shown as "Message from
   * the Blue Bridge team". Null when there is none, and again once she reapplies.
   */
  reviewNote: string | null;
  createdAt: string;
}

/** POST /api/auth/signup: the invitation, the account and the application. */
export interface SignupInput extends ApplicationInput {
  referralCode: string;
  email: string;
  password: string;
}
