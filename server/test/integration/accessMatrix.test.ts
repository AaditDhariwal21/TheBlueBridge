import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';

import { createTestDatabase, skipWithoutDatabase, type TestDatabase } from '../support/database.ts';
import {
  applicationInput,
  categoryId,
  insertBlog,
  insertComment,
  insertUser,
  type TestUser,
} from '../support/fixtures.ts';
import { startTestApp, type TestApp } from '../support/testApp.ts';
import { createTokenKit } from '../support/tokens.ts';

/**
 * The whole permission model, endpoint by endpoint, for every kind of person: visitors, the
 * three approved roles (member, ambassador scoped to their categories, admin), and accounts
 * that are not approved (pending, rejected, suspended), which may only browse. Each case
 * states the expected status for every actor, so a route that lets anyone do more than
 * planned fails here. Rules: server/src/policies/permissions.ts.
 */

type Actor =
  | 'visitor'
  | 'member'
  | 'otherMember'
  | 'techAmb'
  | 'legalAmb'
  | 'admin'
  | 'pendingMember'
  | 'pendingAmb'
  | 'rejected'
  | 'suspendedAmb'
  | 'suspendedAdmin';

const ACTORS: readonly Actor[] = [
  'visitor',
  'member',
  'otherMember',
  'techAmb',
  'legalAmb',
  'admin',
  'pendingMember',
  'pendingAmb',
  'rejected',
  'suspendedAmb',
  'suspendedAdmin',
];
const NOT_APPROVED: readonly Actor[] = [
  'pendingMember',
  'pendingAmb',
  'rejected',
  'suspendedAmb',
  'suspendedAdmin',
];
const APPROVED: readonly Actor[] = ['member', 'otherMember', 'techAmb', 'legalAmb', 'admin'];

/** Expected status per actor: `rest` for everyone not listed. */
function expect(statuses: Partial<Record<Actor, number>>, rest: number): Record<Actor, number> {
  return Object.fromEntries(ACTORS.map((a) => [a, statuses[a] ?? rest])) as Record<Actor, number>;
}
const each = (actors: readonly Actor[], status: number) =>
  Object.fromEntries(actors.map((a) => [a, status])) as Partial<Record<Actor, number>>;

const BODY = 'Notes from a year of practice, with what worked and what did not.';
const doc = (text: string) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

describe(
  'access matrix: every role can do only what it is meant to',
  { skip: skipWithoutDatabase },
  () => {
    let t: TestDatabase;
    let app: TestApp;
    let tokens: Awaited<ReturnType<typeof createTokenKit>>;
    let cat: Record<'tech' | 'legal' | 'finance' | 'health' | 'entrepreneurship', string>;
    let users: Record<Exclude<Actor, 'visitor'>, TestUser>;
    /** Content seeded before each test. */
    let techBlog: string;
    let legalBlog: string;
    let techQueryBlog: string;
    let legalQueryBlog: string;
    let memberQuery: string;
    let ambassadorAnswer: string;
    let legalComment: string;

    before(async () => {
      t = await createTestDatabase();
      tokens = await createTokenKit();
      cat = {
        tech: await categoryId(t.db, 'Tech'),
        legal: await categoryId(t.db, 'Legal'),
        finance: await categoryId(t.db, 'Finance'),
        health: await categoryId(t.db, 'Health'),
        entrepreneurship: await categoryId(t.db, 'Entrepreneurship'),
      };
    });
    after(async () => {
      await t.drop();
    });

    beforeEach(async () => {
      await t.reset();
      const admin = await insertUser(t.db, { role: 'admin', name: 'Admin' });
      users = {
        admin,
        member: await insertUser(t.db, { name: 'Member', referredBy: admin }),
        otherMember: await insertUser(t.db, { name: 'Other Member', referredBy: admin }),
        techAmb: await insertUser(t.db, { role: 'ambassador', categories: ['Tech'] }),
        legalAmb: await insertUser(t.db, { role: 'ambassador', categories: ['Legal'] }),
        pendingMember: await insertUser(t.db, { status: 'pending' }),
        pendingAmb: await insertUser(t.db, {
          role: 'ambassador',
          status: 'pending',
          categories: ['Tech'],
        }),
        rejected: await insertUser(t.db, { status: 'rejected' }),
        suspendedAmb: await insertUser(t.db, {
          role: 'ambassador',
          status: 'suspended',
          categories: ['Tech'],
        }),
        suspendedAdmin: await insertUser(t.db, { role: 'admin', status: 'suspended' }),
      };
      techBlog = await insertBlog(t.db, { authorId: users.member.id, categoryIds: [cat.tech] });
      legalBlog = await insertBlog(t.db, {
        authorId: users.otherMember.id,
        categoryIds: [cat.legal],
      });
      techQueryBlog = await insertBlog(t.db, {
        authorId: admin.id,
        type: 'query',
        categoryIds: [cat.tech],
      });
      legalQueryBlog = await insertBlog(t.db, {
        authorId: admin.id,
        type: 'query',
        categoryIds: [cat.legal],
      });
      memberQuery = await insertComment(t.db, { blogId: techQueryBlog, authorId: users.member.id });
      ambassadorAnswer = await insertComment(t.db, {
        blogId: techQueryBlog,
        authorId: users.techAmb.id,
        parentId: memberQuery,
      });
      legalComment = await insertComment(t.db, { blogId: legalBlog, authorId: users.member.id });
      app = await startTestApp({ db: t.db, verifyAccessToken: tokens.verifyAccessToken });
    });
    afterEach(async () => {
      await app.close();
    });

    const tokenOf = async (actor: Actor) =>
      actor === 'visitor' ? undefined : tokens.sign(users[actor].id);

    /** Runs `request` as every actor and compares each status with the expectation. */
    async function check(
      label: string,
      expected: Record<Actor, number>,
      request: (token: string | undefined, actor: Actor) => Promise<{ status: number }>,
    ) {
      const wrong: string[] = [];
      for (const actor of ACTORS) {
        const { status } = await request(await tokenOf(actor), actor);
        if (status !== expected[actor])
          wrong.push(`${actor}: got ${status}, want ${expected[actor]}`);
      }
      assert.deepEqual(wrong, [], label);
    }

    const get = (path: string) => (token: string | undefined) => app.get(path, token);

    /* ------------------------------------------------------------------ reading */

    it('lets everyone read public content: categories, the Feed, blogs, threads, Query Blogs', async () => {
      const paths = [
        '/health',
        '/categories',
        '/profile-options',
        '/members/count',
        '/blogs',
        '/blogs?q=notes',
        `/blogs/${techBlog}`,
        `/blogs/${techBlog}/comments`,
        '/query-blogs',
        `/query-blogs/${techQueryBlog}`,
        `/blogs/${techQueryBlog}/comments`,
      ];
      for (const path of paths) await check(`GET ${path}`, expect({}, 200), get(path));
    });

    it('shows nobody an unapproved person, not even an admin, outside the admin panel', async () => {
      await check(
        'GET /members/:pending',
        expect({ visitor: 401, ...each(NOT_APPROVED, 403) }, 404),
        get(`/members/${users.pendingMember.id}`),
      );
    });

    it('gives signed-in accounts of any status their own account, and visitors nothing', async () => {
      for (const path of ['/me', '/me/blogs', '/me/comments']) {
        await check(`GET ${path}`, expect({ visitor: 401 }, 200), get(path));
      }
    });

    it('keeps contact details and members’ activity to approved members', async () => {
      const paths = [
        '/me/referrals',
        '/members',
        `/members/${users.member.id}`,
        `/members/${users.member.id}/blogs`,
        `/members/${users.member.id}/comments`,
      ];
      for (const path of paths) {
        await check(
          `GET ${path}`,
          expect({ visitor: 401, ...each(NOT_APPROVED, 403) }, 200),
          get(path),
        );
      }
    });

    it('opens every admin endpoint to approved admins only', async () => {
      const paths = [
        '/admin/overview',
        '/admin/members',
        `/admin/members/${users.member.id}`,
        `/admin/members/${users.member.id}/referrals`,
        '/admin/action-logs',
      ];
      for (const path of paths) {
        await check(`GET ${path}`, expect({ visitor: 401, admin: 200 }, 403), get(path));
      }
    });

    it('has no profile of anyone for visitors, not even a small card', async () => {
      // GET /users/:id (a public profile card) was removed; nothing replaces it.
      await check('GET /users/:id', expect({}, 404), get(`/users/${users.member.id}`));
    });

    it('never shows contact details, profession or review notes where they don’t belong', async () => {
      const feed = await app.get<{ blogs: { author: object }[] }>('/blogs');
      const thread = await app.get<{ comments: { author: object | null }[] }>(
        `/blogs/${techQueryBlog}/comments`,
      );
      for (const author of [
        ...feed.body.blogs.map((b) => b.author),
        ...thread.body.comments.map((c) => c.author),
      ]) {
        assert.deepEqual(Object.keys(author ?? {}).sort(), [
          'avatarUrl',
          'id',
          'name',
          'occupation',
        ]);
      }
      const profile = await app.get<{ member: object }>(
        `/members/${users.member.id}`,
        await tokens.sign(users.otherMember.id),
      );
      assert.equal('reviewNote' in profile.body.member, false);
    });

    /* ------------------------------------------------------------------ writing */

    it('lets only approved accounts write blogs, comments, replies and queries', async () => {
      const writable = expect({ visitor: 401, ...each(NOT_APPROVED, 403) }, 201);
      await check('POST /blogs', writable, (token) =>
        app.post(
          '/blogs',
          { title: 'A first blog post', content: doc(BODY), categoryIds: [cat.finance] },
          token,
        ),
      );
      await check('comment on a blog', writable, (token) =>
        app.post(`/blogs/${techBlog}/comments`, { body: 'Thank you' }, token),
      );
      await check('reply on a blog', writable, (token) =>
        app.post(`/blogs/${legalBlog}/comments`, { parentId: legalComment, body: 'Agreed' }, token),
      );
      // Any approved member may ask in any Query Blog, whatever their categories.
      await check('ask a query', writable, (token) =>
        app.post(`/blogs/${legalQueryBlog}/comments`, { body: 'How do I register a firm?' }, token),
      );
    });

    it('lets only the asker, ambassadors for the topic and admins reply under a query', async () => {
      const replyRule = expect(
        { visitor: 401, ...each(NOT_APPROVED, 403), member: 201, techAmb: 201, admin: 201 },
        403,
      );
      await check('reply to the query', replyRule, (token) =>
        app.post(
          `/blogs/${techQueryBlog}/comments`,
          { parentId: memberQuery, body: 'Answer' },
          token,
        ),
      );
      // Deeper in the same query: still the asker's thread.
      await check('reply to an answer', replyRule, (token) =>
        app.post(
          `/blogs/${techQueryBlog}/comments`,
          { parentId: ambassadorAnswer, body: 'Thanks' },
          token,
        ),
      );
    });

    it('lets only admins start a Query Blog, by either route', async () => {
      const categories = [cat.finance, cat.health, cat.entrepreneurship];
      let next = 0;
      const start = (path: string) => (token: string | undefined, actor: Actor) => {
        // A free category for the one actor that may succeed; refusals never reach it.
        const categoryId = actor === 'admin' ? (categories[next++] ?? cat.finance) : cat.finance;
        return app.post(
          path,
          { categoryId, title: 'Ask us', description: 'Questions welcome here.' },
          token,
        );
      };
      await check(
        'POST /query-blogs',
        expect({ visitor: 401, admin: 201 }, 403),
        start('/query-blogs'),
      );
      await check(
        'POST /admin/query-blogs',
        expect({ visitor: 401, admin: 201 }, 403),
        start('/admin/query-blogs'),
      );
    });

    it('refuses fields a client must not set (author, role, status, avatar)', async () => {
      const token = await tokens.sign(users.member.id);
      const blog = await app.post(
        '/blogs',
        {
          title: 'A first blog post',
          content: doc(BODY),
          categoryIds: [cat.tech],
          authorId: users.admin.id,
        },
        token,
      );
      assert.equal(blog.status, 400);
      const comment = await app.post(
        `/blogs/${techBlog}/comments`,
        { body: 'Hi', userId: users.admin.id },
        token,
      );
      assert.equal(comment.status, 400);
      const rejectedToken = await tokens.sign(users.rejected.id);
      for (const extra of [
        { role: 'admin' },
        { status: 'approved' },
        { avatarUrl: 'https://x.io/a.png' },
      ]) {
        const res = await app.post('/me/reapply', applicationInput(extra), rejectedToken);
        assert.equal(res.status, 400, JSON.stringify(extra));
      }
      const asAdmin = await app.post(
        '/me/reapply',
        applicationInput({ appliedRole: 'admin' }),
        rejectedToken,
      );
      assert.equal(asAdmin.status, 400);
    });

    it('offers no way to change a role, status or categories outside review and reapply', async () => {
      const adminToken = await tokens.sign(users.admin.id);
      const memberToken = await tokens.sign(users.member.id);
      const attempts = [
        app.post('/me', { role: 'admin' }, memberToken),
        app.post(`/admin/members/${users.member.id}/role`, { role: 'admin' }, adminToken),
        app.post(`/admin/members/${users.techAmb.id}/categories`, { categoryIds: [] }, adminToken),
        app.post(`/admin/members/${users.member.id}/suspend`, {}, adminToken),
        app.del(`/admin/members/${users.member.id}`, adminToken),
      ];
      for (const res of await Promise.all(attempts)) assert.equal(res.status, 404);
      // Deciding is only for pending applications, never an approved account or an admin.
      const pendingAdmin = await insertUser(t.db, { role: 'admin', status: 'pending' });
      for (const id of [users.member.id, users.techAmb.id, pendingAdmin.id]) {
        for (const decision of ['approve', 'reject']) {
          const res = await app.post(`/admin/members/${id}/${decision}`, { note: 'x' }, adminToken);
          assert.equal(res.status, 409, `${decision} ${id}`);
        }
      }
    });

    /* --------------------------------------------------------------- moderating */

    it('lets only ambassadors for its categories and admins remove a discussion blog', async () => {
      const removable = expect(
        { visitor: 401, ...each(NOT_APPROVED, 403), techAmb: 204, admin: 204 },
        403,
      );
      // A fresh Tech blog by the member for every actor: even its author may not remove it.
      await check('DELETE a Tech blog', removable, async (token) => {
        const id = await insertBlog(t.db, { authorId: users.member.id, categoryIds: [cat.tech] });
        return app.del(`/blogs/${id}`, token);
      });
      // Any one matching category is enough.
      const multi = expect(
        { visitor: 401, ...each(NOT_APPROVED, 403), legalAmb: 204, admin: 204 },
        403,
      );
      await check('DELETE a Finance + Legal blog', multi, async (token) => {
        const id = await insertBlog(t.db, {
          authorId: users.member.id,
          categoryIds: [cat.finance, cat.legal],
        });
        return app.del(`/blogs/${id}`, token);
      });
    });

    it('lets only ambassadors for the blog’s categories and admins remove comments', async () => {
      const removable = expect(
        { visitor: 401, ...each(NOT_APPROVED, 403), techAmb: 204, admin: 204 },
        403,
      );
      await check(
        'DELETE a comment on a Tech blog (its author included)',
        removable,
        async (token) => {
          const id = await insertComment(t.db, { blogId: techBlog, authorId: users.member.id });
          return app.del(`/blogs/${techBlog}/comments/${id}`, token);
        },
      );
      await check('DELETE a query or answer in the Tech Query Blog', removable, async (token) => {
        const id = await insertComment(t.db, { blogId: techQueryBlog, authorId: users.member.id });
        return app.del(`/blogs/${techQueryBlog}/comments/${id}`, token);
      });
      // A Tech ambassador can't reach a Legal comment by naming a Tech blog in the URL.
      const techToken = await tokens.sign(users.techAmb.id);
      assert.equal(
        (await app.del(`/blogs/${techBlog}/comments/${legalComment}`, techToken)).status,
        404,
      );
      assert.equal(
        (await app.del(`/blogs/${legalBlog}/comments/${legalComment}`, techToken)).status,
        403,
      );
      const thread = await app.get<{ comments: { id: string; removed: boolean }[] }>(
        `/blogs/${legalBlog}/comments`,
      );
      assert.deepEqual(
        thread.body.comments.map((c) => [c.id, c.removed]),
        [[legalComment, false]],
      );
    });

    it('lets only admins remove a whole Query Blog, even in an ambassador’s own category', async () => {
      const adminsOnly = expect({ visitor: 401, admin: 204 }, 403);
      await check('DELETE /blogs/:queryBlog', adminsOnly, async (token, actor) => {
        // One Query Blog per category: only the admin's attempt removes it, then it is re-made.
        const res = await app.del(`/blogs/${techQueryBlog}`, token);
        if (actor === 'admin') {
          techQueryBlog = await insertBlog(t.db, {
            authorId: users.admin.id,
            type: 'query',
            categoryIds: [cat.tech],
          });
        }
        return res;
      });
      await check('DELETE /admin/query-blogs/:id', adminsOnly, (token) =>
        app.del(`/admin/query-blogs/${techQueryBlog}`, token),
      );
    });

    it('hides removed content from everyone, admins included', async () => {
      const adminToken = await tokens.sign(users.admin.id);
      assert.equal((await app.del(`/blogs/${techBlog}`, adminToken)).status, 204);
      await check('GET removed blog', expect({}, 404), get(`/blogs/${techBlog}`));
      await check('GET removed blog comments', expect({}, 404), get(`/blogs/${techBlog}/comments`));
      await check(
        'comment on removed blog',
        expect({ visitor: 401, ...each(NOT_APPROVED, 403) }, 404),
        (token) => app.post(`/blogs/${techBlog}/comments`, { body: 'Hello?' }, token),
      );
    });

    /* ------------------------------------------------------------- applications */

    it('lets only admins approve or reject, and only pending applications', async () => {
      for (const decision of ['approve', 'reject'] as const) {
        await check(
          `POST /admin/members/:id/${decision}`,
          expect({ visitor: 401, admin: 200 }, 403),
          async (token) => {
            const applicant = await insertUser(t.db, { status: 'pending' });
            return app.post(
              `/admin/members/${applicant.id}/${decision}`,
              { note: 'Thanks' },
              token,
            );
          },
        );
      }
    });

    it('lets only a rejected applicant reapply', async () => {
      await check('POST /me/reapply', expect({ visitor: 401, rejected: 200 }, 409), (token) =>
        app.post('/me/reapply', applicationInput({}), token),
      );
    });

    it('has no upload endpoints', async () => {
      const token = await tokens.sign(users.admin.id);
      for (const path of ['/uploads', '/me/avatar', '/blogs/images', '/admin/uploads']) {
        assert.equal((await app.post(path, {}, token)).status, 404, path);
      }
    });

    it('treats the approved roles as listed', () => {
      // Guards the matrix itself: every approved role above is in APPROVED.
      assert.deepEqual([...APPROVED].sort(), [
        'admin',
        'legalAmb',
        'member',
        'otherMember',
        'techAmb',
      ]);
    });
  },
);
