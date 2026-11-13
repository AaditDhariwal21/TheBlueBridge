import { apiRequest } from '../../lib/api';
import type { Page } from '../../lib/usePagedList';
import { getAccessToken } from '../auth/session';
import type { Referral, ReferralsDto } from './types';

export const REFERRALS_PAGE_SIZE = 10;

export function toReferralsPage(data: ReferralsDto): Page<Referral> {
  return { items: data.referrals, nextCursor: data.nextCursor, total: data.counts.total };
}

/** The signed-in member's own referrals, newest first, with the total. */
export async function fetchMyReferrals(
  cursor: string | null,
  signal: AbortSignal,
): Promise<Page<Referral>> {
  const params = new URLSearchParams({ limit: String(REFERRALS_PAGE_SIZE) });
  if (cursor !== null) params.set('cursor', cursor);
  const data = (await apiRequest(`/me/referrals?${params}`, {
    token: await getAccessToken(),
    signal,
  })) as ReferralsDto;
  return toReferralsPage(data);
}
