import { createClient } from '@supabase/supabase-js';

import type { ServerConfig } from '../config/env.ts';

/**
 * Supabase Auth owns identities. The API only creates them (at signup) and
 * deletes them (to undo a failed signup). Behind an interface so tests can use
 * a fake without a Supabase project.
 */
export interface IdentityProvider {
  /** Creates a confirmed email + password user. */
  createUser(input: { email: string; password: string }): Promise<CreateUserResult>;
  deleteUser(userId: string): Promise<void>;
}

export type CreateUserResult =
  { ok: true; userId: string } | { ok: false; reason: 'email_taken' | 'weak_password' };

const EMAIL_TAKEN_CODES = new Set(['email_exists', 'user_already_exists']);

/** Uses the secret key, so it must only ever run on the server. */
export function createSupabaseIdentity(config: ServerConfig['supabase']): IdentityProvider {
  const { auth } = createClient(config.url, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  return {
    async createUser({ email, password }) {
      // email_confirm: admin approval is the verification step, so no confirmation email.
      const { data, error } = await auth.admin.createUser({ email, password, email_confirm: true });
      if (error) {
        if (error.code !== undefined && EMAIL_TAKEN_CODES.has(error.code)) {
          return { ok: false, reason: 'email_taken' };
        }
        if (error.code === 'weak_password') return { ok: false, reason: 'weak_password' };
        throw new Error('Supabase Auth could not create the user', { cause: error });
      }
      return { ok: true, userId: data.user.id };
    },

    async deleteUser(userId) {
      const { error } = await auth.admin.deleteUser(userId);
      if (error) throw new Error('Supabase Auth could not delete the user', { cause: error });
    },
  };
}
