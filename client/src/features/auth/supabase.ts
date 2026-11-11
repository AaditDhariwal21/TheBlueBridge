import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The browser's Supabase client, used only for Auth (sign-in, session refresh,
 * sign-out). All data goes through our API. The publishable key is public by
 * design; the secret key must never appear in client code.
 *
 * supabase-js is loaded on first use rather than bundled into every page: it
 * is large, and the first paint of a page doesn't need it.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** False when the env vars are missing: the site still works, and the auth screens say why. */
export const authConfigured = Boolean(url && publishableKey);

let client: Promise<SupabaseClient> | null = null;

/** The shared client (created once). Null when auth isn't configured. */
export function getSupabase(): Promise<SupabaseClient> | null {
  if (!url || !publishableKey) return null;
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    }),
  );
  return client;
}

if (!authConfigured) {
  console.error(
    'Sign-in is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in client/.env.local (see docs/SUPABASE_SETUP.md).',
  );
}
