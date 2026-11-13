import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { Kysely, PostgresDialect, type CompiledQuery } from 'kysely';
import { Pool } from 'pg';

import type { Database, Db } from '../../src/db/schema.ts';
import { selectAdminActions } from '../../src/features/adminLog/adminLog.repository.ts';
import { selectFeed, selectFeedSearch } from '../../src/features/blogs/blogs.repository.ts';
import { selectMembers } from '../../src/features/members/members.repository.ts';
import { createTestDatabase, skipWithoutDatabase, type TestDatabase } from '../support/database.ts';
import { categoryId, insertUser } from '../support/fixtures.ts';

/**
 * The new list queries can be served by their indexes. The SQL is captured from the real
 * repository functions and EXPLAINed with sequential scans disabled, so the test fails if a
 * query's shape stops matching its index (a tiny test table would otherwise always be
 * scanned sequentially). Real plans on realistic data are in docs/DATABASE.md.
 */
describe('query plans', { skip: skipWithoutDatabase }, () => {
  let t: TestDatabase;
  let pool: Pool;
  let db: Db;
  /** The last query the repository ran. */
  const log: { last: CompiledQuery | null } = { last: null };

  before(async () => {
    t = await createTestDatabase();
    // One connection, so the session setting below applies to every EXPLAIN.
    pool = new Pool({ connectionString: t.url, max: 1 });
    await pool.query('set enable_seqscan = off');
    db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool }),
      log: (event) => {
        if (event.level === 'query') log.last = event.query;
      },
    });
  });
  after(async () => {
    await db.destroy();
    await t.drop();
  });

  /** Runs `query` (to capture its SQL), then returns the EXPLAIN text of that SQL. */
  async function planOf(query: () => Promise<unknown>): Promise<string> {
    log.last = null;
    await query();
    const captured = log.last as CompiledQuery | null;
    assert.ok(captured, 'no query was captured');
    const { rows } = await pool.query<{ 'QUERY PLAN': string }>(`explain ${captured.sql}`, [
      ...captured.parameters,
    ]);
    return rows.map((r) => r['QUERY PLAN']).join('\n');
  }

  const cursor = { createdAt: '2026-01-01 00:00:00+00', id: crypto.randomUUID() };

  it('directory: an ordered range scan of users_directory_idx, no sort, filtered or not', async () => {
    const page = { limit: 20, cursor: { k: 1, n: 'meera', id: crypto.randomUUID() } };
    const approved = { status: 'approved' as const };
    for (const filter of [approved, { ...approved, q: 'mee', roles: ['member'] as const }]) {
      const plan = await planOf(() => selectMembers(db, filter, page));
      assert.match(plan, /Index Scan using users_directory_idx/, JSON.stringify(filter));
      assert.match(plan, /Index Cond: \(ROW\(role_rank, lower\(name\), user_id\) > ROW\(/);
      assert.doesNotMatch(plan, /Sort/);
    }
  });

  it('admin Community Directory: users_admin_directory_idx in order, no sort', async () => {
    const page = { limit: 20, cursor: { k: 0, n: 'aarti', id: crypto.randomUUID() } };
    const plan = await planOf(() => selectMembers(db, {}, page));
    assert.match(plan, /Index Scan using users_admin_directory_idx/);
    assert.doesNotMatch(plan, /Sort/);
    // "Pending only" is a small set: the pending queue's partial index, then a cheap sort.
    const pending = await planOf(() => selectMembers(db, { status: 'pending' }, page));
    assert.match(pending, /users_pending_queue_idx/);
  });

  it('feed search: blogs_search_idx, once there are blogs to search', async () => {
    // On an empty table walking blogs_feed_idx is cheaper; give the planner real numbers.
    const author = await insertUser(t.db);
    const tech = await categoryId(t.db, 'Tech');
    await t.pool.query('begin');
    await t.pool.query(
      `insert into public.blogs (user_id, type, title, body)
       select $1, 'discussion', 'Post ' || g || ' on topic' || (g % 50), 'Notes number ' || g
       from generate_series(1, 3000) as g`,
      [author.id],
    );
    await t.pool.query(
      `insert into public.blogs_categories (blog_id, cat_id) select blog_id, $1 from public.blogs`,
      [tech],
    );
    await t.pool.query('commit');
    await t.pool.query('analyze public.blogs');

    const plan = await planOf(() =>
      selectFeedSearch(db, 'women & lead:*', [], { limit: 10, cursor: null }),
    );
    assert.match(plan, /Bitmap Index Scan on blogs_search_idx/);
  });

  it('feed by category: blogs_feed_idx in order, categories by key', async () => {
    const plan = await planOf(() =>
      selectFeed(db, [crypto.randomUUID(), crypto.randomUUID()], { limit: 10, cursor }),
    );
    assert.match(plan, /blogs_feed_idx/);
    assert.match(plan, /blogs_categories_(pkey|cat_idx)/);
  });

  it('activity log: the index for each filter, newest first, no sort', async () => {
    const page = { limit: 20, cursor };
    const cases = [
      [{}, 'admin_action_logs_recent_idx'],
      [{ action: 'member_approved' as const }, 'admin_action_logs_action_idx'],
      [{ adminId: crypto.randomUUID() }, 'admin_action_logs_admin_idx'],
    ] as const;
    for (const [filter, index] of cases) {
      const plan = await planOf(() => selectAdminActions(db, filter, page));
      assert.match(plan, new RegExp(`Index Scan using ${index}`), JSON.stringify(filter));
      assert.doesNotMatch(plan, /Sort/);
    }
  });
});
