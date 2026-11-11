import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ApiError, retryTransient } from '../../lib/api';
import { fetchMe } from './api';
import {
  AuthContext,
  type AuthContextValue,
  type AuthState,
  type SignInResult,
} from './authContext';
import { authConfigured, getSupabase } from './supabase';
import { getAccessToken } from './session';
import type { Me } from './types';

/**
 * How long to keep retrying the profile when the API is briefly unreachable
 * (dev server restarting, a deploy, a sleeping host waking up): ~30 s in total.
 */
const PROFILE_RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 15_000];

type Profile =
  | { status: 'loading'; userId: string }
  | { status: 'ready'; userId: string; me: Me }
  | { status: 'error'; userId: string };

/**
 * Session state from supabase-js, plus the API profile (GET /api/me) for the
 * signed-in user. The profile is fetched when the user changes, not on every
 * token refresh. A session whose user has no profile is signed out.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // undefined until supabase-js reports the stored session (INITIAL_SESSION).
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notice, setNotice] = useState<'noAccount' | undefined>(undefined);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loading = getSupabase();
    if (!loading) return;
    let unsubscribe: (() => void) | undefined;
    let unmounted = false;
    void loading.then((supabase) => {
      if (unmounted) return;
      // Only record the change here: supabase-js advises against awaiting its own
      // calls inside this callback.
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setUserId(session?.user.id ?? null);
      });
      unsubscribe = () => {
        data.subscription.unsubscribe();
      };
    });
    return () => {
      unmounted = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (typeof userId !== 'string') return;
    const stale = new AbortController(); // aborted when the user changes or on unmount

    void (async () => {
      // No session any more (signed out meanwhile): the auth listener handles it.
      const token = await getAccessToken().catch(() => null);
      if (token === null) return;
      try {
        const me = await retryTransient(
          () => fetchMe(token),
          PROFILE_RETRY_DELAYS_MS,
          stale.signal,
        );
        if (!stale.signal.aborted) setProfile({ status: 'ready', userId, me });
      } catch (error) {
        if (stale.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          // Valid Supabase login, but not a member of this site.
          setNotice('noAccount');
          await (await getSupabase())?.auth.signOut({ scope: 'local' });
          return;
        }
        setProfile({ status: 'error', userId });
      }
    })();

    return () => {
      stale.abort();
    };
  }, [userId, reloadKey]);

  const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    const supabase = await getSupabase();
    if (!supabase) return { ok: false, reason: 'unavailable' };
    setNotice(undefined);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return { ok: true };
    return { ok: false, reason: error.code === 'invalid_credentials' ? 'invalid' : 'unavailable' };
  }, []);

  const signOut = useCallback(async () => {
    await (await getSupabase())?.auth.signOut();
  }, []);

  const reload = useCallback(() => {
    setProfile((current) => current && { status: 'loading', userId: current.userId });
    setReloadKey((key) => key + 1);
  }, []);

  // Still failing after the retries: try again by itself when the tab comes back
  // into view or the network returns, instead of waiting for a click.
  const profileFailed = profile?.status === 'error';
  useEffect(() => {
    if (!profileFailed) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload();
    };
    window.addEventListener('online', reload);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', reload);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [profileFailed, reload]);

  const state = useMemo((): AuthState => {
    if (!authConfigured) return { status: 'signedOut', notice: 'notConfigured' };
    if (userId === undefined) return { status: 'loading' };
    if (userId === null) return notice ? { status: 'signedOut', notice } : { status: 'signedOut' };
    if (profile?.userId !== userId || profile.status === 'loading') return { status: 'loading' };
    if (profile.status === 'error') return { status: 'error' };
    return { status: 'signedIn', me: profile.me };
  }, [userId, profile, notice]);

  const value = useMemo<AuthContextValue>(
    () => ({ state, signIn, signOut, reload }),
    [state, signIn, signOut, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
