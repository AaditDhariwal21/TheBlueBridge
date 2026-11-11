import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

import { sql } from 'kysely';

import {
  createTestDatabase,
  pgError,
  skipWithoutDatabase,
  type TestDatabase,
} from '../support/database.ts';
import {
  categoryId,
  insertBlog,
  insertComment,
  insertUser,
  type TestUser,
} from '../support/fixtures.ts';

describe('database constraints and triggers', { skip: skipWithoutDatabase }, () => {
  let t: TestDatabase;
  let tech: string;
  let finance: string;
  let legal: string;
  let author: TestUser;

  before(async () => {
    t = await createTestDatabase();
    tech = await categoryId(t.db, 'Tech');
    finance = await categoryId(t.db, 'Finance');
    legal = await categoryId(t.db, 'Legal');
  });
  after(async () => {
    await t.drop();
  });
  beforeEach(async () => {
    await t.reset();
    author = await insertUser(t.db);
  });

  const addCategory = (userId: string, catId: string) =>
    t.db.insertInto('user_categories').values({ user_id: userId, cat_id: catId }).execute();

  async function isWaitingOnLock(pid: number | undefined): Promise<boolean> {
    const { rows } = await t.pool.query(
      `select 1 from pg_stat_activity where pid = $1 and wait_event_type = 'Lock'`,
      [pid],
    );
    return rows.length > 0;
  }

  async function waitUntil(condition: () => Promise<boolean>): Promise<void> {
    for (let i = 0; i < 200; i++) {
      if (await condition()) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error('timed out');
  }

  describe('ambassador categories', () => {
    it('allows up to 2 categories and refuses a third', async () => {
      const ambassador = await insertUser(t.db, {
        role: 'ambassador',
        categories: ['Tech', 'Finance'],
      });
      const error = await pgError(addCategory(ambassador.id, legal));
      assert.equal(error.constraint, 'user_categories_max_two');
    });

    it('refuses categories for members and admins', async () => {
      const admin = await insertUser(t.db, { role: 'admin' });
      for (const user of [author, admin]) {
        const error = await pgError(addCategory(user.id, tech));
        assert.equal(error.constraint, 'user_categories_ambassador_only');
      }
    });

    it('refuses to change an ambassador with categories to another role', async () => {
      const ambassador = await insertUser(t.db, { role: 'ambassador', categories: ['Tech'] });
      const demote = () =>
        t.db
          .updateTable('users')
          .set({ role: 'member' })
          .where('user_id', '=', ambassador.id)
          .execute();

      assert.equal((await pgError(demote())).constraint, 'user_categories_ambassador_only');
      await t.db.deleteFrom('user_categories').where('user_id', '=', ambassador.id).execute();
      await demote();
    });

    it('holds the limit when two transactions add categories at the same time', async () => {
      const ambassador = await insertUser(t.db, { role: 'ambassador', categories: ['Tech'] });
      const first = await t.pool.connect();
      const second = await t.pool.connect();
      try {
        await first.query('begin');
        await second.query('begin');
        const { rows } = await second.query<{ pid: number }>('select pg_backend_pid() as pid');
        const secondPid = rows[0]?.pid;
        await first.query('insert into public.user_categories values ($1, $2)', [
          ambassador.id,
          finance,
        ]);

        let settled = false;
        const racing = second
          .query('insert into public.user_categories values ($1, $2)', [ambassador.id, legal])
          .finally(() => {
            settled = true;
          });
        racing.catch(() => null); // inspected below

        // Without the owner-row lock the second insert would finish here, seeing
        // only 2 categories, and the ambassador would end up with 3.
        await waitUntil(async () => settled || (await isWaitingOnLock(secondPid)));
        assert.equal(settled, false, 'the second insert should wait for the first transaction');

        await first.query('commit');
        assert.equal((await pgError(racing)).constraint, 'user_categories_max_two');
      } finally {
        await second.query('rollback');
        first.release();
        second.release();
      }
    });
  });

  describe('blog categories (checked at commit)', () => {
    it('requires at least one category on a discussion blog', async () => {
      const error = await pgError(insertBlog(t.db, { authorId: author.id, categoryIds: [] }));
      assert.equal(error.constraint, 'blogs_discussion_has_category');

      await insertBlog(t.db, { authorId: author.id, categoryIds: [tech, finance] });
    });

    it('refuses to remove the last category of a discussion blog', async () => {
      const blogId = await insertBlog(t.db, { authorId: author.id, categoryIds: [tech] });
      const error = await pgError(
        t.db.deleteFrom('blogs_categories').where('blog_id', '=', blogId).execute(),
      );
      assert.equal(error.constraint, 'blogs_discussion_has_category');
    });

    it('requires exactly one category on a query blog', async () => {
      for (const categoryIds of [[], [tech, finance]]) {
        const error = await pgError(
          insertBlog(t.db, { authorId: author.id, type: 'query', categoryIds }),
        );
        assert.equal(error.constraint, 'blogs_query_one_category');
      }
    });

    it('allows one live query blog per category', async () => {
      const first = await insertBlog(t.db, {
        authorId: author.id,
        type: 'query',
        categoryIds: [tech],
      });
      const duplicate = await pgError(
        insertBlog(t.db, { authorId: author.id, type: 'query', categoryIds: [tech] }),
      );
      assert.equal(duplicate.constraint, 'blogs_one_query_blog_per_category');
      assert.equal(duplicate.code, '23505');

      // Another category is fine, and so is a replacement once the first is deleted.
      await insertBlog(t.db, { authorId: author.id, type: 'query', categoryIds: [finance] });
      await t.db
        .updateTable('blogs')
        .set({ deleted_at: new Date(), deleted_by: author.id })
        .where('blog_id', '=', first)
        .execute();
      await insertBlog(t.db, { authorId: author.id, type: 'query', categoryIds: [tech] });

      // Undeleting the old one would make two live query blogs.
      const undelete = await pgError(
        t.db
          .updateTable('blogs')
          .set({ deleted_at: null, deleted_by: null })
          .where('blog_id', '=', first)
          .execute(),
      );
      assert.equal(undelete.constraint, 'blogs_one_query_blog_per_category');
    });
  });

  describe('comments', () => {
    it('requires a reply to be on the same blog as its parent', async () => {
      const blogA = await insertBlog(t.db, { authorId: author.id, categoryIds: [tech] });
      const blogB = await insertBlog(t.db, { authorId: author.id, categoryIds: [tech] });
      const parent = await insertComment(t.db, { blogId: blogA, authorId: author.id });

      await insertComment(t.db, { blogId: blogA, authorId: author.id, parentId: parent });
      const error = await pgError(
        insertComment(t.db, { blogId: blogB, authorId: author.id, parentId: parent }),
      );
      assert.equal(error.constraint, 'comments_parent_same_blog_fkey');
    });

    it('removes comments and category links when a blog is deleted', async () => {
      const blogId = await insertBlog(t.db, { authorId: author.id, categoryIds: [tech] });
      const parent = await insertComment(t.db, { blogId, authorId: author.id });
      await insertComment(t.db, { blogId, authorId: author.id, parentId: parent });

      await t.db.deleteFrom('blogs').where('blog_id', '=', blogId).execute();
      const { rows } = await sql<{ n: number }>`
        select (select count(*) from public.comments)::int
             + (select count(*) from public.blogs_categories)::int as n
      `.execute(t.db);
      assert.equal(rows[0]?.n, 0);
    });
  });

  describe('deletion rules', () => {
    it('keeps a category while a blog or an ambassador uses it', async () => {
      await insertBlog(t.db, { authorId: author.id, categoryIds: [tech] });
      await insertUser(t.db, { role: 'ambassador', categories: ['Legal'] });
      for (const catId of [tech, legal]) {
        const error = await pgError(
          t.db.deleteFrom('categories').where('cat_id', '=', catId).execute(),
        );
        assert.equal(error.code, '23503');
      }
    });

    it('never removes a user as a side effect', async () => {
      const error = await pgError(
        sql`delete from auth.users where id = ${author.id}`.execute(t.db),
      );
      assert.equal(error.constraint, 'users_user_id_fkey');
    });
  });

  describe('paired and ordered columns', () => {
    it('requires reviewed_by and reviewed_at together', async () => {
      const error = await pgError(
        t.db
          .updateTable('users')
          .set({ reviewed_at: new Date() })
          .where('user_id', '=', author.id)
          .execute(),
      );
      assert.equal(error.constraint, 'users_reviewed_pair_check');
    });

    it('requires deleted_at and deleted_by together', async () => {
      const blogId = await insertBlog(t.db, { authorId: author.id, categoryIds: [tech] });
      const error = await pgError(
        t.db
          .updateTable('blogs')
          .set({ deleted_at: new Date() })
          .where('blog_id', '=', blogId)
          .execute(),
      );
      assert.equal(error.constraint, 'blogs_deleted_pair_check');
    });

    it('never lets updated_at precede created_at', async () => {
      const blogId = await insertBlog(t.db, { authorId: author.id, categoryIds: [tech] });
      const error = await pgError(
        t.db
          .updateTable('blogs')
          .set({ created_at: new Date(Date.now() + 86_400_000) })
          .where('blog_id', '=', blogId)
          .execute(),
      );
      assert.equal(error.constraint, 'blogs_timestamps_check');
    });

    it('keeps updated_at current on update', async () => {
      await sql`update public.users set updated_at = created_at where user_id = ${author.id}`.execute(
        t.db,
      );
      await sql`select pg_sleep(0.01)`.execute(t.db);
      await t.db
        .updateTable('users')
        .set({ occupation: 'Architect' })
        .where('user_id', '=', author.id)
        .execute();
      const row = await t.db
        .selectFrom('users')
        .select(['created_at', 'updated_at'])
        .where('user_id', '=', author.id)
        .executeTakeFirstOrThrow();
      assert.ok(row.updated_at > row.created_at);
    });
  });
});
