import { apiRequest } from '../../lib/api';
import { useQuery } from '../../lib/useQuery';
import { getAccessToken } from '../auth/session';
import type { Me } from '../auth/types';
import type { ApplicationInput, ProfileOptions } from './types';

async function fetchProfileOptions(signal: AbortSignal): Promise<ProfileOptions> {
  const data = (await apiRequest('/profile-options', { signal })) as { options: ProfileOptions };
  return data.options;
}

/** The application's choices (connections, journey stages, reasons, weekly hours). Public. */
export function useProfileOptions() {
  return useQuery('profile-options', fetchProfileOptions);
}

/** A rejected applicant's new application; resolves to her updated (pending) profile. */
export async function reapply(input: ApplicationInput): Promise<Me> {
  const data = (await apiRequest('/me/reapply', {
    method: 'POST',
    body: input,
    token: await getAccessToken(),
  })) as { user: Me };
  return data.user;
}
