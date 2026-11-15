import type { Role, Status } from '../auth/types';
import type { MemberProfile, MemberSummary } from '../members/types';
import type { ReferralsDto } from '../referrals/types';

/** Shapes returned by /api/admin (server/src/features/members and adminLog). */

export interface PendingCounts {
  total: number;
  members: number;
  ambassadors: number;
}

export interface AdminMemberSummary extends MemberSummary {
  status: Status;
}

export interface AdminMember {
  member: MemberProfile & {
    status: Status;
    reviewedAt: string | null;
    /** The latest decision's note, as she sees it ("Message from the Blue Bridge team"). */
    reviewNote: string | null;
  };
  /** Every logged decision about her, newest first, with the admin and the note. */
  history: AdminActionEntry[];
  referredBy: { id: string; name: string; role: Role } | null;
  /** The people who joined with their code: the first page and the total. */
  referrals: ReferralsDto;
}

export type MemberStatusFilter = 'pending' | 'approved' | 'rejected';

export interface MemberFilters {
  q: string;
  status: MemberStatusFilter | null;
  role: Role | null;
}

export type AdminAction =
  | 'member_approved'
  | 'ambassador_approved'
  | 'member_rejected'
  | 'ambassador_rejected'
  | 'query_blog_created'
  | 'query_blog_deleted';

export interface AdminActionEntry {
  id: string;
  action: AdminAction;
  admin: { id: string; name: string };
  target: { type: 'user' | 'blog'; id: string; label: string };
  /** The note or reason the admin gave, if any. */
  reason: string | null;
  createdAt: string;
}
