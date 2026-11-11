import { ApiError } from '../../lib/api';
import { getSupabase } from './supabase';

/** The current access token (refreshed by supabase-js if needed), for authenticated API calls. */
export async function getAccessToken(): Promise<string> {
  const supabase = await getSupabase();
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  return session.access_token;
}
