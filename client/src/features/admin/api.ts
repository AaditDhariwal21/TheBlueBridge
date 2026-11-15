import { apiRequest } from '../../lib/api';
import type { Page } from '../../lib/usePagedList';
import { getAccessToken } from '../auth/session';
import type { Role } from '../auth/types';
import { toReferralsPage } from '../referrals/api';
import type { Referral, ReferralsDto } from '../referrals/types';
import type {
  AdminAction,
  AdminActionEntry,
  AdminMember,
  AdminMemberSummary,
  MemberFilters,
  PendingCounts,
} from './types';

/** Every call needs an approved admin; the API checks that on each request. */
async function adminRequest(
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal } = {},
): Promise<unknown> {
  return apiRequest(`/admin${path}`, { ...options, token: await getAccessToken() });
}

export const ADMIN_PAGE_SIZE = 20;

function pageParams(
  cursor: string | null,
  limit: number,
  extra: Record<string, string | null> = {},
): string {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor !== null) params.set('cursor', cursor);
  for (const [key, value] of Object.entries(extra)) if (value) params.set(key, value);
  return params.toString();
}

export async function fetchOverview(signal: AbortSignal): Promise<PendingCounts> {
  const data = (await adminRequest('/overview', { signal })) as { pending: PendingCounts };
  return data.pending;
}

export async function fetchMembers(
  filters: MemberFilters,
  cursor: string | null,
  limit: number,
  signal: AbortSignal,
): Promise<Page<AdminMemberSummary, Record<Role, number>>> {
  const query = pageParams(cursor, limit, {
    q: filters.q || null,
    status: filters.status,
    role: filters.role,
  });
  const data = (await adminRequest(`/members?${query}`, { signal })) as {
    members: AdminMemberSummary[];
    nextCursor: string | null;
    counts: Record<Role, number>;
  };
  return { items: data.members, nextCursor: data.nextCursor, meta: data.counts };
}

const memberPath = (id: string) => `/members/${encodeURIComponent(id)}`;

export async function fetchMember(id: string, signal: AbortSignal): Promise<AdminMember> {
  return (await adminRequest(memberPath(id), { signal })) as AdminMember;
}

export async function fetchMemberReferrals(
  id: string,
  cursor: string | null,
  limit: number,
  signal: AbortSignal,
): Promise<Page<Referral>> {
  const data = (await adminRequest(`${memberPath(id)}/referrals?${pageParams(cursor, limit)}`, {
    signal,
  })) as ReferralsDto;
  return toReferralsPage(data);
}

/**
 * Approves a pending member or ambassador, with an optional note they'll see as a message
 * from the team; resolves to their updated record.
 */
export async function approveMember(id: string, note: string | null): Promise<AdminMember> {
  return (await adminRequest(`${memberPath(id)}/approve`, {
    method: 'POST',
    body: { note },
  })) as AdminMember;
}

/** Rejects a pending application with the required note that tells her why. */
export async function rejectMember(id: string, note: string): Promise<AdminMember> {
  return (await adminRequest(`${memberPath(id)}/reject`, {
    method: 'POST',
    body: { note },
  })) as AdminMember;
}

export async function fetchActivity(
  action: AdminAction | null,
  cursor: string | null,
  limit: number,
  signal: AbortSignal,
): Promise<Page<AdminActionEntry>> {
  const data = (await adminRequest(`/action-logs?${pageParams(cursor, limit, { action })}`, {
    signal,
  })) as { entries: AdminActionEntry[]; nextCursor: string | null };
  return { items: data.entries, nextCursor: data.nextCursor };
}
