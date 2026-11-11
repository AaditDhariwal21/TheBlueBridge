/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Canonical site origin, without a trailing slash. Public; not a secret. */
  readonly VITE_SITE_URL?: string;
  /** https://<project-ref>.supabase.co. Public. */
  readonly VITE_SUPABASE_URL?: string;
  /** The publishable key (sb_publishable_...). Public by design; never the secret key. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
