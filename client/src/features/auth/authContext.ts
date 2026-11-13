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
  /** Fetch the profile again (after an error). */
  reload: () => void;
  /** Fetch the profile again to see whether an admin has approved it, and say what changed. */
  checkApproval: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
