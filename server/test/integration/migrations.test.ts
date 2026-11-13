import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { after, before, describe, it } from 'node:test';

import { pendingMigrations, runMigrations } from '../../src/db/migrator.ts';
import { createTestDatabase, skipWithoutDatabase, type TestDatabase } from '../support/database.ts';
import { categoryId, insertBlog, insertUser } from '../support/fixtures.ts';

const MIGRATIONS = new URL('../../src/db/migrations/', import.meta.url);
const DOWN = new URL('down/', MIGRATIONS);

/** Every migration from 0007 on ships a down script that undoes it completely. */
describe('reversible migrations', { skip: skipWithoutDatabase }, () => {
  let t: TestDatabase;

  before(async () => {
    t = await createTestDatabase();
  });
  after(async () => {
    await t.drop();
  });

  async function exists(sqlText: string): Promise<boolean> {
    const { rows } = await t.pool.query<{ found: boolean }>(`select (${sqlText}) as found`);
    return rows[0]?.found === true;
  }

  const objects = {
    adminLog: `to_regclass('public.admin_action_logs') is not null`,
    logFunction: `exists (select 1 from pg_proc where proname = 'reject_admin_action_log_change')`,
    roleRank: `exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'role_rank')`,
    directoryIndex: `to_regclass('public.users_directory_idx') is not null`,
    searchVector: `exists (select 1 from information_schema.columns where table_name = 'blogs' and column_name = 'search_vector')`,
    searchIndex: `to_regclass('public.blogs_search_idx') is not null`,
  };

  it('has a down script for each migration from 0007 on, and none without one', async () => {
    const ups = (await readdir(MIGRATIONS)).filter((f) => /^\d{4}_.+\.sql$/.test(f));
    const downs = (await readdir(DOWN)).map((f) => f.replace(/\.down\.sql$/, '.sql'));
    assert.deepEqual(downs.sort(), ups.filter((f) => f >= '0007').sort());
  });

  it('reverts them in reverse order on a database with data, then re-applies them', async () => {
    const author = await insertUser(t.db, { role: 'admin' });
    await insertBlog(t.db, { authorId: author.id, categoryIds: [await categoryId(t.db, 'Tech')] });

    const downs = (await readdir(DOWN)).sort().reverse();
    for (const file of downs) await t.pool.query(await readFile(new URL(file, DOWN), 'utf8'));

    for (const [name, check] of Object.entries(objects)) {
      assert.equal(await exists(check), false, `${name} should be gone`);
    }
    assert.deepEqual(
      await pendingMigrations(t.pool),
      downs.map((f) => f.replace(/\.down\.sql$/, '.sql')).reverse(),
    );

    await runMigrations(t.pool);
    assert.deepEqual(await pendingMigrations(t.pool), []);
    for (const [name, check] of Object.entries(objects)) {
      assert.equal(await exists(check), true, `${name} should be back`);
    }
    // Existing rows got the generated columns.
    const { rows } = await t.pool.query<{ role_rank: number }>(
      'select role_rank from public.users where user_id = $1',
      [author.id],
    );
    assert.equal(rows[0]?.role_rank, 0);
  });
});
