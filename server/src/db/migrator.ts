import { readdir, readFile } from 'node:fs/promises';

import type { Pool } from 'pg';

const MIGRATIONS_DIR = new URL('./migrations/', import.meta.url);
const MIGRATION_FILE = /^\d{4}_[a-z0-9_]+\.sql$/;
/** Arbitrary, fixed key: only one migration run at a time per database. */
const ADVISORY_LOCK_KEY = 4_172_026;

const TRACKING_TABLE_SQL = `
  create table if not exists public.schema_migrations (
    name       text primary key,
    applied_at timestamptz not null default now()
  );
  alter table public.schema_migrations enable row level security;
  revoke all on public.schema_migrations from anon, authenticated;
`;

/** Migration files not yet recorded in public.schema_migrations, in order. */
export async function pendingMigrations(pool: Pool): Promise<string[]> {
  const { rows } = await pool
    .query<{ name: string }>('select name from public.schema_migrations')
    .catch((error: unknown) => {
      // No tracking table yet (42P01 undefined_table): nothing has been applied.
      if ((error as { code?: string }).code === '42P01') return { rows: [] };
      throw error;
    });
  const applied = new Set(rows.map((row) => row.name));
  return (await migrationFiles()).filter((file) => !applied.has(file));
}

async function migrationFiles(): Promise<string[]> {
  return (await readdir(MIGRATIONS_DIR)).filter((f) => MIGRATION_FILE.test(f)).sort();
}

/**
 * Applies pending ./migrations/*.sql files in filename order, each in its own
 * transaction, and records them in public.schema_migrations. Applied files must
 * never be edited; add a new file instead. Returns the names it applied.
 *
 * Needs a session-capable connection (direct, or the session pooler): it holds
 * a session-level advisory lock for the whole run.
 */
export async function runMigrations(pool: Pool): Promise<string[]> {
  const client = await pool.connect();
  try {
    await client.query('select pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
    await client.query(TRACKING_TABLE_SQL);

    const { rows } = await client.query<{ name: string }>(
      'select name from public.schema_migrations',
    );
    const applied = new Set(rows.map((row) => row.name));
    const files = await migrationFiles();

    const ran: string[] = [];
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(new URL(file, MIGRATIONS_DIR), 'utf8');
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into public.schema_migrations (name) values ($1)', [file]);
        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        throw new Error(`Migration ${file} failed`, { cause: error });
      }
      ran.push(file);
    }
    return ran;
  } finally {
    await client.query('select pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]).catch(() => null);
    client.release();
  }
}
