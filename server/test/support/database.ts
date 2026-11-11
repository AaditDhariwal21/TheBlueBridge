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
  /** Removes every user and everything they own. Categories stay. */
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
    async reset() {
      await sql`truncate auth.users cascade`.execute(db);
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
