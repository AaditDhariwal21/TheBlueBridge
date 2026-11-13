import type { Role, Status } from '../auth/types';

/** Someone who joined with a member's referral code (GET /api/me/referrals). */
export interface Referral {
  id: string;
  name: string;
  occupation: string;
  role: Role;
  status: Status;
  avatarUrl: string | null;
  joinedAt: string;
}

/** One page of referrals as the API sends it. */
export interface ReferralsDto {
  referrals: Referral[];
  nextCursor: string | null;
  counts: { total: number };
}
