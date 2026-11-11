import type { Category } from '../categories/types';

/** Shapes returned by the API (server/src/features/*). */

export type Role = 'member' | 'ambassador' | 'admin';
export type Status = 'pending' | 'approved' | 'rejected' | 'suspended';
export type AppliedRole = Extract<Role, 'member' | 'ambassador'>;

/** GET /api/me */
export interface Me {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string;
  occupation: string;
  role: Role;
  status: Status;
  avatarUrl: string | null;
  /** An ambassador's 1 or 2 categories; empty for members and admins. */
  categories: Category[];
  referralCode: string | null;
  createdAt: string;
}

/** POST /api/auth/signup */
export interface SignupInput {
  referralCode: string;
  email: string;
  password: string;
  name: string;
  phoneNumber: string;
  occupation: string;
  appliedRole: AppliedRole;
  categoryIds: string[];
}
