/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Canonical site origin, without a trailing slash. Public; not a secret. */
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
