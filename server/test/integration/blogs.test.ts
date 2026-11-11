import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';

import type {
  BlogDetailDto,
  BlogDto,
  QueryBlogDto,
} from '../../src/features/blogs/blogs.service.ts';
import type { CommentDto } from '../../src/features/comments/comments.service.ts';
import { createTestDatabase, skipWithoutDatabase, type TestDatabase } from '../support/database.ts';
import { categoryId, insertUser, type TestUser } from '../support/fixtures.ts';
import { startTestApp, type TestApp } from '../support/testApp.ts';
import { createTokenKit } from '../support/tokens.ts';

const BODY = 'A practical, first-hand account of what worked and what did not. '.repeat(3);

/** A formatted document as the editor sends it, with one paragraph of `text`. */
const doc = (text: string, extra: unknown[] = []) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }, ...extra],
});

describe('blogs, Query Blogs and comments API', { skip: skipWithoutDatabase }, () => {
  let t: TestDatabase;
  let app: TestApp;
  let tokens: Awaited<ReturnType<typeof createTokenKit>>;
  let cat: Record<'tech' | 'finance' | 'legal' | 'health', string>;
  let admin: TestUser;
  let techAmbassador: TestUser;
  let legalAmbassador: TestUser;
  let member: TestUser;
  let otherMember: TestUser;
  let pending: TestUser;

  before(async () => {
    t = await createTestDatabase();
    tokens = await createTokenKit();
    cat = {
      tech: await categoryId(t.db, 'Tech'),
      finance: await categoryId(t.db, 'Finance'),
      legal: await categoryId(t.db, 'Legal'),
      health: await categoryId(t.db, 'Health'),
    };
  });
  after(async () => {
    await t.drop();
  });

  beforeEach(async () => {
    await t.reset();
    admin = await insertUser(t.db, { role: 'admin', name: 'Admin' });
    techAmbassador = await insertUser(t.db, { role: 'ambassador', categories: ['Tech'] });
    legalAmbassador = await insertUser(t.db, { role: 'ambassador', categories: ['Legal'] });
    member = await insertUser(t.db, { name: 'Member One' });
    otherMember = await insertUser(t.db, { name: 'Member Two' });
    pending = await insertUser(t.db, { status: 'pending' });
    app = await startTestApp({ db: t.db, verifyAccessToken: tokens.verifyAccessToken });
  });
  afterEach(async () => {
    await app.close();
  });

  const as = (user: TestUser) => tokens.sign(user.id);

  async function publish(
    user: TestUser,
    categoryIds: string[],
    title = 'Lessons from my first year',
  ) {
    const res = await app.post<{ blog: BlogDetailDto }>(
      '/blogs',
      { title, content: doc(BODY), categoryIds },
      await as(user),
    );
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res.body.blog;
  }

  async function startQueryBlog(user: TestUser, categoryKey: keyof typeof cat) {
    return app.post<{ queryBlog: QueryBlogDto }>(
      '/query-blogs',
      {
        categoryId: cat[categoryKey],
        title: 'Ask about ' + categoryKey,
        description: 'Questions about ' + categoryKey + ', answered by our ambassadors.',
      },
      await as(user),
    );
  }

  async function comment(
    user: TestUser,
    blogId: string,
    parentId: string | null,
    body = 'Thank you',
  ) {
    return app.post<{ comment: CommentDto }>(
      `/blogs/${blogId}/comments`,
      { parentId, body },
      await as(user),
    );
  }

  /* --------------------------------------------------------- discussion */

  it('publishes a discussion blog and serves it in the feed and on its own', async () => {
    const blog = await publish(member, [cat.tech, cat.finance]);
    assert.deepEqual(
      blog.categories.map((c) => [c.name, c.color]),
      [
        ['Finance', 'green'],
        ['Tech', 'blue'],
      ],
    );
    assert.equal(blog.author.name, 'Member One');
    assert.equal(blog.body, BODY.trim());
    assert.deepEqual(blog.content, doc(BODY));
    assert.equal(blog.commentCount, 0);
    assert.ok(blog.readTimeMinutes >= 1);

    const feed = await app.get<{ blogs: BlogDto[]; nextCursor: string | null }>('/blogs');
    assert.equal(feed.status, 200);
    assert.deepEqual(
      feed.body.blogs.map((b) => b.id),
      [blog.id],
    );
    assert.ok(!('body' in (feed.body.blogs[0] ?? {})), 'the feed sends excerpts, not bodies');

    const detail = await app.get<{ blog: BlogDetailDto }>(`/blogs/${blog.id}`);
    assert.equal(detail.body.blog.title, blog.title);
  });

  it('refuses blogs from visitors, pending accounts and invalid input', async () => {
    const input = { title: 'A perfectly good title', content: doc(BODY), categoryIds: [cat.tech] };
    assert.equal((await app.post('/blogs', input)).status, 401);

    const fromPending = await app.post('/blogs', input, await as(pending));
    assert.equal(fromPending.status, 403);
    assert.equal(fromPending.body.error.code, 'ACCOUNT_NOT_APPROVED');

    const invalid = await app.post(
      '/blogs',
      { title: 'Short', content: doc('Too short'), categoryIds: [] },
      await as(member),
    );
    assert.equal(invalid.status, 400);
    assert.deepEqual(Object.keys(invalid.body.error.fields ?? {}).sort(), [
      'categoryIds',
      'content',
      'title',
    ]);

    const unknownCategory = await app.post(
      '/blogs',
      { ...input, categoryIds: [crypto.randomUUID()] },
      await as(member),
    );
    assert.equal(unknownCategory.status, 400);
    assert.ok(unknownCategory.body.error.fields?.categoryIds);
  });

  it('pages through the feed newest first without repeats', async () => {
    const ids = [];
    for (const title of [
      'First blog post title',
      'Second blog post title',
      'Third blog post title',
    ]) {
      ids.push((await publish(member, [cat.health], title)).id);
    }
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const query: string = cursor === null ? '' : `&cursor=${cursor}`;
      const res: { body: { blogs: BlogDto[]; nextCursor: string | null } } = await app.get(
        `/blogs?limit=2${query}`,
      );
      seen.push(...res.body.blogs.map((b) => b.id));
      cursor = res.body.nextCursor;
    } while (cursor !== null);
    assert.deepEqual(seen, [...ids].reverse());
  });

  it('keeps Query Blogs and removed blogs out of the feed', async () => {
    const queryBlog = (await startQueryBlog(admin, 'tech')).body.queryBlog;
    const removed = await publish(member, [cat.tech]);
    assert.equal((await app.del(`/blogs/${removed.id}`, await as(admin))).status, 204);

    const feed = await app.get<{ blogs: BlogDto[] }>('/blogs');
    assert.deepEqual(feed.body.blogs, []);
    assert.equal((await app.get(`/blogs/${removed.id}`)).status, 404);
    assert.equal((await app.get(`/blogs/${queryBlog.id}`)).status, 404);
    assert.equal((await app.get('/blogs/not-a-uuid')).status, 404);
  });

  /* --------------------------------------------------------- Query Blogs */

  it('lets only admins start a Query Blog, once per category', async () => {
    assert.equal((await startQueryBlog(member, 'tech')).status, 403);
    assert.equal((await startQueryBlog(techAmbassador, 'tech')).status, 403);
    assert.equal((await startQueryBlog(pending, 'tech')).status, 403);

    const created = await startQueryBlog(admin, 'tech');
    assert.equal(created.status, 201);
    assert.equal(created.body.queryBlog.category.name, 'Tech');
    assert.equal(created.body.queryBlog.queryCount, 0);

    const duplicate = await app.post(
      '/query-blogs',
      { categoryId: cat.tech, title: 'Tech again', description: 'A second Tech Query Blog.' },
      await as(admin),
    );
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.code, 'CONFLICT');

    assert.equal((await startQueryBlog(admin, 'finance')).status, 201);
    const list = await app.get<{ queryBlogs: QueryBlogDto[] }>('/query-blogs');
    assert.deepEqual(list.body.queryBlogs.map((q) => q.category.name).sort(), ['Finance', 'Tech']);
  });

  it('frees the category when its Query Blog is removed', async () => {
    const first = (await startQueryBlog(admin, 'tech')).body.queryBlog;
    // Its ambassadors can still moderate it, though only admins start one.
    assert.equal((await app.del(`/blogs/${first.id}`, await as(techAmbassador))).status, 204);
    assert.equal((await app.get(`/query-blogs/${first.id}`)).status, 404);
    assert.equal((await startQueryBlog(admin, 'tech')).status, 201);
  });

  /* ------------------------------------------------------------ comments */

  it('lets approved members comment and reply on a discussion blog', async () => {
    const blog = await publish(member, [cat.finance]);
    assert.equal((await app.post(`/blogs/${blog.id}/comments`, { body: 'Hi' })).status, 401);
    assert.equal((await comment(pending, blog.id, null)).status, 403);

    const top = await comment(otherMember, blog.id, null, 'Very useful, thank you.');
    assert.equal(top.status, 201);
    assert.equal(top.body.comment.author.name, 'Member Two');
    const reply = await comment(member, blog.id, top.body.comment.id, 'Glad it helped!');
    assert.equal(reply.status, 201);
    assert.equal(reply.body.comment.parentId, top.body.comment.id);

    const detail = await app.get<{ blog: BlogDetailDto }>(`/blogs/${blog.id}`);
    assert.equal(detail.body.blog.commentCount, 2);
    const thread = await app.get<{ comments: CommentDto[] }>(`/blogs/${blog.id}/comments`);
    assert.deepEqual(
      thread.body.comments.map((c) => c.body),
      ['Very useful, thank you.', 'Glad it helped!'],
    );
  });

  it('refuses replies to comments on other blogs, removed comments and empty bodies', async () => {
    const blogA = await publish(member, [cat.finance]);
    const blogB = await publish(member, [cat.health]);
    const onA = (await comment(member, blogA.id, null)).body.comment;

    assert.equal((await comment(member, blogB.id, onA.id)).status, 404);
    assert.equal((await comment(member, blogA.id, crypto.randomUUID())).status, 404);
    assert.equal((await comment(member, blogA.id, null, '   ')).status, 400);

    await app.del(`/blogs/${blogA.id}/comments/${onA.id}`, await as(admin));
    assert.equal((await comment(member, blogA.id, onA.id)).status, 404);
  });

  it('applies the query rules: anyone asks, only the asker, topic ambassadors and admins reply', async () => {
    const queryBlog = (await startQueryBlog(admin, 'tech')).body.queryBlog;
    const query = await comment(member, queryBlog.id, null, 'SQL or Python first?');
    assert.equal(query.status, 201);
    const queryId = query.body.comment.id;

    // Another member, and an ambassador for a different category, cannot answer…
    assert.equal((await comment(otherMember, queryBlog.id, queryId)).status, 403);
    assert.equal((await comment(legalAmbassador, queryBlog.id, queryId)).status, 403);
    // …but anyone approved can ask their own query.
    assert.equal((await comment(legalAmbassador, queryBlog.id, null, 'Me too?')).status, 201);

    const answer = await comment(techAmbassador, queryBlog.id, queryId, 'SQL first.');
    assert.equal(answer.status, 201);
    assert.equal((await comment(admin, queryBlog.id, queryId, 'Agreed.')).status, 201);
    // The asker can reply anywhere under their own query, including to an answer.
    assert.equal(
      (await comment(member, queryBlog.id, answer.body.comment.id, 'Thanks!')).status,
      201,
    );

    const list = await app.get<{ queryBlogs: QueryBlogDto[] }>('/query-blogs');
    assert.equal(list.body.queryBlogs[0]?.queryCount, 2);
  });

  it('keeps allowed formatting, drops unknown attributes and refuses unsafe content', async () => {
    const formatted = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'A heading' }] },
        {
          type: 'paragraph',
          attrs: { textAlign: 'left' },
          content: [
            { type: 'text', text: BODY, marks: [{ type: 'bold' }, { type: 'underline' }] },
            {
              type: 'text',
              text: 'a link',
              marks: [{ type: 'link', attrs: { href: 'https://example.org', target: '_blank' } }],
            },
          ],
        },
      ],
    };
    const res = await app.post<{ blog: BlogDetailDto }>(
      '/blogs',
      { title: 'Formatting is kept', content: formatted, categoryIds: [cat.tech] },
      await as(member),
    );
    assert.equal(res.status, 201);
    const paragraph = res.body.blog.content?.content[1];
    assert.deepEqual(paragraph, {
      type: 'paragraph',
      content: [
        { type: 'text', text: BODY, marks: [{ type: 'bold' }, { type: 'underline' }] },
        {
          type: 'text',
          text: 'a link',
          marks: [{ type: 'link', attrs: { href: 'https://example.org' } }],
        },
      ],
    });
    assert.equal(res.body.blog.body, `A heading\n\n${BODY}a link`);

    for (const bad of [
      doc(BODY, [{ type: 'image', attrs: { src: 'https://example.org/x.png' } }]),
      doc(BODY, [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'x',
              marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
            },
          ],
        },
      ]),
      '<p>Not a document</p>',
    ]) {
      const refused = await app.post(
        '/blogs',
        { title: 'Unsafe content here', content: bad, categoryIds: [cat.tech] },
        await as(member),
      );
      assert.equal(refused.status, 400);
      assert.ok(refused.body.error.fields?.content);
    }
  });

  it("lists a member's own blogs and comments, newest first, and only to them", async () => {
    const first = await publish(member, [cat.health], 'My first blog post');
    const second = await publish(member, [cat.finance], 'My second blog post');
    await publish(otherMember, [cat.tech], 'Somebody else wrote this');
    const removed = await publish(member, [cat.health], 'This one gets removed');
    await app.del(`/blogs/${removed.id}`, await as(admin));

    const onOther = (await comment(member, first.id, null, 'A comment of mine')).body.comment;
    await comment(otherMember, first.id, null, 'Not mine');
    const reply = (await comment(member, second.id, null, 'Another of mine')).body.comment;

    assert.equal((await app.get('/me/blogs')).status, 401);
    const blogs = await app.get<{ blogs: (BlogDto & { type: string })[] }>(
      '/me/blogs',
      await as(member),
    );
    assert.deepEqual(
      blogs.body.blogs.map((b) => [b.id, b.type]),
      [
        [second.id, 'discussion'],
        [first.id, 'discussion'],
      ],
    );

    const comments = await app.get<{
      comments: { id: string; body: string; blog: { id: string; title: string } }[];
      nextCursor: string | null;
    }>('/me/comments?limit=1', await as(member));
    assert.deepEqual(
      comments.body.comments.map((c) => [c.id, c.blog.title]),
      [[reply.id, 'My second blog post']],
    );
    const next = await app.get<{ comments: { id: string }[] }>(
      `/me/comments?limit=1&cursor=${comments.body.nextCursor ?? ''}`,
      await as(member),
    );
    assert.deepEqual(
      next.body.comments.map((c) => c.id),
      [onOther.id],
    );
  });

  /* ----------------------------------------------------------- moderation */

  it('lets ambassadors moderate blogs with any matching category, and admins anything', async () => {
    const techAndFinance = await publish(member, [cat.finance, cat.tech]);
    const health = await publish(member, [cat.health]);

    assert.equal((await app.del(`/blogs/${techAndFinance.id}`, await as(member))).status, 403);
    assert.equal(
      (await app.del(`/blogs/${techAndFinance.id}`, await as(legalAmbassador))).status,
      403,
    );
    assert.equal((await app.del(`/blogs/${health.id}`, await as(techAmbassador))).status, 403);
    assert.equal(
      (await app.del(`/blogs/${techAndFinance.id}`, await as(techAmbassador))).status,
      204,
    );
    assert.equal((await app.del(`/blogs/${health.id}`, await as(admin))).status, 204);
    assert.equal((await app.del(`/blogs/${health.id}`, await as(admin))).status, 404);
  });

  it('removes a comment but keeps its replies, and keeps counts in step', async () => {
    const blog = await publish(member, [cat.tech]);
    const parent = (await comment(member, blog.id, null, 'Original')).body.comment;
    await comment(otherMember, blog.id, parent.id, 'A reply');

    const path = `/blogs/${blog.id}/comments/${parent.id}`;
    assert.equal((await app.del(path, await as(legalAmbassador))).status, 403);
    assert.equal((await app.del(path, await as(techAmbassador))).status, 204);
    assert.equal((await app.del(path, await as(techAmbassador))).status, 404);

    const thread = await app.get<{ comments: CommentDto[] }>(`/blogs/${blog.id}/comments`);
    assert.deepEqual(
      thread.body.comments.map((c) => [c.removed, c.body]),
      [
        [true, null],
        [false, 'A reply'],
      ],
    );
    const detail = await app.get<{ blog: BlogDetailDto }>(`/blogs/${blog.id}`);
    assert.equal(detail.body.blog.commentCount, 1);
  });
});
