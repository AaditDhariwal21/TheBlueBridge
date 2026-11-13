import { apiRequest } from '../../lib/api';
import type { Page } from '../../lib/usePagedList';
import type { Role } from '../auth/types';
import { getAccessToken } from '../auth/session';
import type { MemberProfile, MemberSummary } from './types';

const PAGE_SIZE = 20;

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
  signal: AbortSignal,
): Promise<Page<MemberSummary, DirectoryCounts>> {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
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

/**
 * Profiles opened this session, so opening one again is instant. Keyed by the signed-in
 * member too, so another account in the same tab never sees this one's cache.
 */
const opened = new Map<string, MemberProfile>();
const cacheKey = (viewerId: string, memberId: string) => `${viewerId}:${memberId}`;

export async function fetchProfile(
  viewerId: string,
  memberId: string,
  signal: AbortSignal,
): Promise<MemberProfile> {
  const cached = opened.get(cacheKey(viewerId, memberId));
  if (cached) return cached;
  const data = (await apiRequest(`/members/${encodeURIComponent(memberId)}`, {
    token: await getAccessToken(),
    signal,
  })) as { member: MemberProfile };
  opened.set(cacheKey(viewerId, memberId), data.member);
  return data.member;
}
