import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { sql } from 'kysely';
import { Pool } from 'pg';

import { createDatabase } from '../../src/db/client.ts';
import { runMigrations } from '../../src/db/migrator.ts';
import type { Db } from '../../src/db/schema.ts';
import { seedCategories } from '../../src/db/seed.ts';

const ADMIN_URL = process.env.TEST_DATABASE_URL;

/**
 * Pass as `{ skip }` to describe(). Integration suites need a disposable Postgres
 * and are skipped, with this explanation, when TEST_DATABASE_URL is not set.
 */
export const skipWithoutDatabase =
  ADMIN_URL === undefined
    ? 'needs a database: npm run test:db:up -w server, then npm run test:integration -w server'
    : false;

export interface TestDatabase {
  db: Db;
  pool: Pool;
  /** Connection string of this database, for tests that need their own connection. */
  url: string;
  /** Removes every user and everything they own, the admin action log included. Categories stay. */
  reset(): Promise<void>;
  drop(): Promise<void>;
}

/**
 * A fresh database per test file (so files can run in parallel), with the
 * Supabase shim, every migration and the category seed applied.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  if (ADMIN_URL === undefined) throw new Error('TEST_DATABASE_URL is not set');
  const name = `tbb_test_${randomBytes(6).toString('hex')}`;
  await withAdmin(ADMIN_URL, `create database ${name}`);

  const url = new URL(ADMIN_URL);
  url.pathname = `/${name}`;
  const pool = new Pool({ connectionString: url.toString(), max: 10 });
  await pool.query(await readFile(new URL('./supabaseShim.sql', import.meta.url), 'utf8'));
  await runMigrations(pool);
  const db = createDatabase(pool);
  await seedCategories(db);

  return {
    db,
    pool,
    url: url.toString(),
    async reset() {
      // The admin action log refuses TRUNCATE (append-only, 0007). This throwaway database
      // skips ordinary triggers for the reset (a superuser-only setting).
      await db.transaction().execute(async (trx) => {
        await sql`set local session_replication_role = replica`.execute(trx);
        await sql`truncate auth.users cascade`.execute(trx);
      });
    },
    async drop() {
      await db.destroy();
      await withAdmin(ADMIN_URL, `drop database ${name} with (force)`);
    },
  };
}

async function withAdmin(url: string, statement: string): Promise<void> {
  const admin = new Pool({ connectionString: url, max: 1 });
  try {
    await admin.query(statement);
  } finally {
    await admin.end();
  }
}

/** True while the backend `pid` is waiting for a lock held by another transaction. */
export async function isWaitingOnLock(pool: Pool, pid: number | undefined): Promise<boolean> {
  const { rows } = await pool.query(
    `select 1 from pg_stat_activity where pid = $1 and wait_event_type = 'Lock'`,
    [pid],
  );
  return rows.length > 0;
}

/** Polls `condition` every 10 ms for up to 2 s. */
export async function waitUntil(condition: () => Promise<boolean>): Promise<void> {
  for (let i = 0; i < 200; i++) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('timed out');
}

/** Resolves to the Postgres error a promise rejects with (constraint name, SQLSTATE). */
export async function pgError(
  promise: Promise<unknown>,
): Promise<{ code?: string; constraint?: string; message: string }> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof Error) return error;
    throw error;
  }
  throw new Error('Expected the database to reject this, but it succeeded');
}
