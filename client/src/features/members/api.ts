import { apiRequest } from '../../lib/api';
import type { Page } from '../../lib/usePagedList';
import type { Role } from '../auth/types';
import { getAccessToken } from '../auth/session';
import type { MemberProfile, MemberSummary } from './types';

export const DIRECTORY_PAGE_SIZE = 20;

/** Directory search. Mirrors DIRECTORY_SEARCH_LIMITS in server/src/features/members. */
export const DIRECTORY_SEARCH_RULES = { queryMin: 2, queryMax: 100, debounceMs: 300 } as const;

export interface DirectoryFilters {
  /** Name or occupation; sent only from `queryMin` characters. */
  q: string;
  /** Any of these roles; empty means everyone. */
  roles: readonly Role[];
}

/** How many match in each role, across all pages. */
export type DirectoryCounts = Record<Role, number>;

export async function fetchDirectoryPage(
  filters: DirectoryFilters,
  cursor: string | null,
  limit: number,
  signal: AbortSignal,
): Promise<Page<MemberSummary, DirectoryCounts>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor !== null) params.set('cursor', cursor);
  if (filters.q) params.set('q', filters.q);
  if (filters.roles.length > 0) params.set('roles', filters.roles.join(','));
  const data = (await apiRequest(`/members?${params}`, {
    token: await getAccessToken(),
    signal,
  })) as { members: MemberSummary[]; nextCursor: string | null; counts: DirectoryCounts };
  return { items: data.members, nextCursor: data.nextCursor, meta: data.counts };
}

/** How many approved people the community has. Public. */
export async function fetchCommunitySize(signal: AbortSignal): Promise<number> {
  const data = (await apiRequest('/members/count', { signal })) as { count: number };
  return data.count;
}

/** A member's full profile (approved viewers only). Cached by the caller (useQuery). */
export async function fetchProfile(memberId: string, signal: AbortSignal): Promise<MemberProfile> {
  const data = (await apiRequest(`/members/${encodeURIComponent(memberId)}`, {
    token: await getAccessToken(),
    signal,
  })) as { member: MemberProfile };
  return data.member;
}
