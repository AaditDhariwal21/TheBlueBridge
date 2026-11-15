import { createContext, useContext } from 'react';

import type { Me } from './types';

export type AuthState =
  | { status: 'loading' }
  | {
      status: 'signedOut';
      /** Why the user is signed out, when it is not their own doing. */
      notice?: 'noAccount' | 'notConfigured';
    }
  | { status: 'signedIn'; me: Me }
  /** Signed in with Supabase, but the profile could not be loaded (network, server). */
  | { status: 'error' };

export type SignInResult = { ok: true } | { ok: false; reason: 'invalid' | 'unavailable' };

export interface AuthContextValue {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  /** Fetch the profile again (after an error), showing the loading state meanwhile. */
  reload: () => void;
  /**
   * Fetch the profile again in the background, keeping the current one on screen until the
   * fresh one arrives. Pages showing it call this on entry; tab focus does it too.
   */
  refresh: () => void;
  /** Replace the profile with one an action returned (e.g. after reapplying). */
  setMe: (me: Me) => void;
  /** Fetch the profile again to see whether an admin has decided, and say what changed. */
  checkApproval: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
