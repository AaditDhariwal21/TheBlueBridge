import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

import { sql } from 'kysely';

import { selectThread } from '../../src/features/comments/comments.repository.ts';
import { createTestDatabase, skipWithoutDatabase, type TestDatabase } from '../support/database.ts';
import {
  categoryId,
  insertBlog,
  insertComment,
  insertUser,
  type TestUser,
} from '../support/fixtures.ts';

interface PurgeRun {
  blogs_deleted: number;
  blog_comments_deleted: number;
  comments_deleted: number;
  comments_scrubbed: number;
  complete: boolean;
}

/** public.purge_soft_deleted(): 30 days after a soft delete, the data goes for good. */
describe('purge of soft-deleted blogs and comments', { skip: skipWithoutDatabase }, () => {
  let t: TestDatabase;
  let tech: string;
  let author: TestUser;
  let moderator: TestUser;

  before(async () => {
    t = await createTestDatabase();
    tech = await categoryId(t.db, 'Tech');
  });
  after(async () => {
    await t.drop();
  });
  beforeEach(async () => {
    await t.reset();
    author = await insertUser(t.db, { name: 'Author' });
    moderator = await insertUser(t.db, { role: 'admin', name: 'Moderator' });
  });

  const blog = () => insertBlog(t.db, { authorId: author.id, categoryIds: [tech] });
  const reply = (blogId: string, parentId?: string) =>
    insertComment(t.db, {
      blogId,
      authorId: author.id,
      ...(parentId !== undefined && { parentId }),
    });

  /** Soft-deletes a row as if it happened `days` days ago. */
  async function deletedDaysAgo(table: 'blogs' | 'comments', id: string, days: number) {
    const key = table === 'blogs' ? 'blog_id' : 'comment_id';
    await sql`
      update ${sql.table(table)}
      set deleted_at = now() - make_interval(days => ${days}), deleted_by = ${moderator.id}
      where ${sql.ref(key)} = ${id}
    `.execute(t.db);
  }

  async function purge(args = sql``): Promise<PurgeRun | null> {
    const { rows } = await sql<{ run: PurgeRun | null }>`
      select to_jsonb(public.purge_soft_deleted(${args})) as run
    `.execute(t.db);
    return rows[0]?.run ?? null;
  }

  async function commentRow(id: string) {
    return t.db
      .selectFrom('comments')
      .select(['user_id', 'body'])
      .where('comment_id', '=', id)
      .executeTakeFirst();
  }

  it('hard-deletes blogs removed over 30 days ago, with their comments and links', async () => {
    const old = await blog();
    const oldComment = await reply(old);
    await reply(old, oldComment);
    const recent = await blog();
    const live = await blog();
    await deletedDaysAgo('blogs', old, 31);
    await deletedDaysAgo('blogs', recent, 29);

    const run = await purge();
    assert.deepEqual(run && [run.blogs_deleted, run.blog_comments_deleted, run.complete], [
      1,
      2,
      true,
    ]);
    const left = await t.db.selectFrom('blogs').select('blog_id').execute();
    assert.deepEqual(left.map((r) => r.blog_id).sort(), [recent, live].sort());
    const links = await t.db
      .selectFrom('blogs_categories')
      .select('blog_id')
      .where('blog_id', '=', old)
      .execute();
    assert.deepEqual(links, []);
    assert.equal(await commentRow(oldComment), undefined);
  });

  it('deletes old removed comments without replies, children before parents', async () => {
    const blogId = await blog();
    // A removed chain: parent → child, both removed long ago. One pass of the leaf rule only
    // removes the child; the parent becomes a leaf and goes in the next pass of the same run.
    const parent = await reply(blogId);
    const child = await reply(blogId, parent);
    const recentLeaf = await reply(blogId);
    await deletedDaysAgo('comments', parent, 40);
    await deletedDaysAgo('comments', child, 35);
    await deletedDaysAgo('comments', recentLeaf, 3);

    const run = await purge();
    assert.equal(run?.comments_deleted, 2);
    assert.equal(run.comments_scrubbed, 0);
    assert.equal(await commentRow(parent), undefined);
    assert.equal(await commentRow(child), undefined);
    assert.ok(await commentRow(recentLeaf), 'deleted 3 days ago: kept for now');
  });

  it('keeps an old removed comment that still has replies, scrubbed, until its last reply goes', async () => {
    const blogId = await blog();
    const parent = await reply(blogId);
    const liveReply = await reply(blogId, parent);
    const recentReply = await reply(blogId, parent);
    await deletedDaysAgo('comments', parent, 45);
    await deletedDaysAgo('comments', recentReply, 10);

    const first = await purge();
    assert.deepEqual(first && [first.comments_deleted, first.comments_scrubbed], [0, 1]);
    assert.deepEqual(await commentRow(parent), { user_id: null, body: null });
    // The thread still holds the live reply under a blank placeholder.
    const thread = await selectThread(t.db, blogId);
    assert.deepEqual(
      thread.map((row) => [row.comment_id, row.removed, row.author_id]),
      [
        [parent, true, null],
        [liveReply, false, author.id],
      ],
    );

    // Its replies go (the live one removed, the other one old enough): so does the placeholder.
    await deletedDaysAgo('comments', liveReply, 31);
    await deletedDaysAgo('comments', recentReply, 31);
    const second = await purge();
    assert.equal(second?.comments_deleted, 3);
    assert.equal(await commentRow(parent), undefined);
  });

  it('is idempotent and records every run', async () => {
    await t.db.deleteFrom('purge_runs').execute(); // runs from earlier tests
    const blogId = await blog();
    await deletedDaysAgo('blogs', blogId, 60);
    await purge();
    const again = await purge();
    assert.deepEqual(
      again && [
        again.blogs_deleted,
        again.blog_comments_deleted,
        again.comments_deleted,
        again.comments_scrubbed,
      ],
      [0, 0, 0, 0],
    );
    const runs = await t.db
      .selectFrom('purge_runs')
      .select(['blogs_deleted', 'complete'])
      .orderBy('run_id')
      .execute();
    assert.deepEqual(runs, [
      { blogs_deleted: 1, complete: true },
      { blogs_deleted: 0, complete: true },
    ]);
  });

  it('works in batches and stops at its budget, leaving the rest for the next run', async () => {
    const blogIds = [await blog(), await blog(), await blog()];
    for (const id of blogIds) await deletedDaysAgo('blogs', id, 31);

    const bounded = await purge(sql`batch_size => 1, max_batches => 2`);
    assert.deepEqual(bounded && [bounded.blogs_deleted, bounded.complete], [2, false]);
    const rest = await purge(sql`batch_size => 1`);
    assert.deepEqual(rest && [rest.blogs_deleted, rest.complete], [1, true]);
    assert.deepEqual(await t.db.selectFrom('blogs').select('blog_id').execute(), []);
  });

  it('does nothing while another run holds the lock', async () => {
    const client = await t.pool.connect();
    try {
      await client.query('begin');
      await client.query('select public.purge_soft_deleted()');
      // The first run's transaction still holds the advisory lock.
      assert.equal(await purge(), null);
    } finally {
      await client.query('rollback');
      client.release();
    }
    assert.ok(await purge(), 'runs again once the lock is free');
  });

  it('refuses a scrubbed row that still has an author or text, or a live one without', async () => {
    const blogId = await blog();
    const id = await reply(blogId);
    const blank = (values: { user_id: null; body?: null }) =>
      t.db.updateTable('comments').set(values).where('comment_id', '=', id).execute();
    await assert.rejects(blank({ user_id: null }), { constraint: 'comments_scrubbed_check' });
    await assert.rejects(blank({ user_id: null, body: null }), {
      constraint: 'comments_scrubbed_deleted_check',
    });
  });
});
