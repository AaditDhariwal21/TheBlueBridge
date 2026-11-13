import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import type { BlogDto } from '../../src/features/blogs/blogs.service.ts';
import { createTestDatabase, skipWithoutDatabase, type TestDatabase } from '../support/database.ts';
import { categoryId, insertBlog, insertUser } from '../support/fixtures.ts';
import { startTestApp, type TestApp, type TestResponse } from '../support/testApp.ts';

interface FeedPage {
  blogs: BlogDto[];
  nextCursor: string | null;
}

describe('Feed search and category filter', { skip: skipWithoutDatabase }, () => {
  let t: TestDatabase;
  let app: TestApp;
  let cat: Record<'tech' | 'finance' | 'legal' | 'health', string>;
  const id: Record<string, string> = {};

  before(async () => {
    t = await createTestDatabase();
    app = await startTestApp({ db: t.db });
    cat = {
      tech: await categoryId(t.db, 'Tech'),
      finance: await categoryId(t.db, 'Finance'),
      legal: await categoryId(t.db, 'Legal'),
      health: await categoryId(t.db, 'Health'),
    };
    const author = await insertUser(t.db);
    let minute = 0;
    const blog = async (
      key: string,
      title: string,
      body: string,
      categoryIds: string[],
      extra: { type?: 'query' } = {},
    ) => {
      minute += 1;
      id[key] = await insertBlog(t.db, {
        authorId: author.id,
        title,
        body,
        categoryIds,
        createdAt: new Date(Date.UTC(2026, 0, 1, 9, minute)),
        ...extra,
      });
    };
    // Oldest first.
    await blog('womenInTitle', 'Women in leadership', 'Notes from a panel.', [cat.tech]);
    await blog('womenInBody', 'Panel notes', 'Many women spoke about leadership.', [cat.finance]);
    await blog('investing', 'Investing basics', 'Start with an index fund.', [
      cat.finance,
      cat.tech,
    ]);
    await blog('legal', 'Property papers', 'What to check before you sign.', [cat.legal]);
    await blog('hindi', 'महिला उद्यमी', 'उद्यमिता के बारे में।', [cat.health]);
    await blog('query', 'Women questions', 'A Query Blog about women.', [cat.health], {
      type: 'query',
    });
    await blog('removed', 'Women removed', 'This one was removed.', [cat.tech]);
    await t.db
      .updateTable('blogs')
      .set({ deleted_at: new Date(), deleted_by: author.id })
      .where('blog_id', '=', id.removed ?? '')
      .execute();
  });
  after(async () => {
    await app.close();
    await t.drop();
  });

  const feed = async (query: string) => {
    const res = await app.get<FeedPage>(`/blogs?${query}`);
    assert.equal(res.status, 200, `${query}: ${JSON.stringify(res.body)}`);
    return res.body;
  };
  const ids = async (query: string) => (await feed(query)).blogs.map((b) => b.id);

  it('matches the last word as a prefix and ranks title matches first', async () => {
    assert.deepEqual(await ids('q=wom'), [id.womenInTitle, id.womenInBody]);
    assert.deepEqual(await ids('q=women'), [id.womenInTitle, id.womenInBody]);
    assert.deepEqual(await ids('q=Invest'), [id.investing]);
    // Every word must match; only the last one is a prefix.
    assert.deepEqual(await ids('q=women lead'), [id.womenInTitle, id.womenInBody]);
    assert.deepEqual(await ids('q=wom leadership'), []);
    assert.deepEqual(await ids('q=महिला'), [id.hindi]);
  });

  it('never searches Query Blogs or removed blogs', async () => {
    const found = await ids('q=women');
    assert.ok(!found.includes(id.query ?? '') && !found.includes(id.removed ?? ''));
  });

  it('answers odd input without errors', async () => {
    for (const q of [
      "'women'",
      '"women',
      'women & | !',
      'wo:*',
      '(women)',
      'women <-> panel',
      '\\\\',
      '!!',
      '😀😀',
      "' or 1=1 --",
      '%_%',
    ]) {
      const res = await app.get<FeedPage>(`/blogs?q=${encodeURIComponent(q)}`);
      assert.equal(res.status, 200, q);
    }
    // Operators are stripped, the words still count.
    assert.deepEqual(await ids(`q=${encodeURIComponent("'women' & !")}`), [
      id.womenInTitle,
      id.womenInBody,
    ]);
    // Nothing searchable left: no results rather than everything.
    assert.deepEqual(await ids('q=!!'), []);
  });

  it('filters by any of the chosen categories, without duplicates', async () => {
    assert.deepEqual(await ids(`categories=${cat.tech}`), [id.investing, id.womenInTitle]);
    // "investing" is in both Finance and Tech: listed once.
    assert.deepEqual(await ids(`categories=${cat.tech},${cat.finance}`), [
      id.investing,
      id.womenInBody,
      id.womenInTitle,
    ]);
    assert.deepEqual(await ids(`categories=${cat.tech},${cat.tech}`), [
      id.investing,
      id.womenInTitle,
    ]);
    // A Query Blog's category does not bring the Query Blog in.
    assert.deepEqual(await ids(`categories=${cat.health}`), [id.hindi]);
  });

  it('combines search and categories with AND', async () => {
    assert.deepEqual(await ids(`q=women&categories=${cat.finance}`), [id.womenInBody]);
    assert.deepEqual(await ids(`q=women&categories=${cat.legal}`), []);
  });

  it('keeps the plain Feed exactly as before', async () => {
    const page = await feed('limit=50');
    assert.deepEqual(
      page.blogs.map((b) => b.id),
      [id.hindi, id.legal, id.investing, id.womenInBody, id.womenInTitle],
    );
    assert.equal(page.nextCursor, null);
  });

  it('pages through search results without gaps or repeats when ranks and times tie', async () => {
    const author = await insertUser(t.db);
    const sameTime = new Date(Date.UTC(2026, 0, 2, 9, 0));
    const twins: string[] = [];
    for (let i = 0; i < 5; i++) {
      twins.push(
        await insertBlog(t.db, {
          authorId: author.id,
          title: 'Mentoring circles',
          body: 'Same words, same rank.',
          categoryIds: [cat.legal],
          // Two share a timestamp exactly, so the id decides.
          createdAt: i < 2 ? sameTime : new Date(sameTime.getTime() + i * 60_000),
        }),
      );
    }
    for (const limit of [1, 2, 3]) {
      const seen: string[] = [];
      let cursor: string | null = null;
      do {
        const query: string = cursor === null ? '' : `&cursor=${cursor}`;
        const res: TestResponse<FeedPage> = await app.get(`/blogs?q=mentor&limit=${limit}${query}`);
        assert.equal(res.status, 200);
        seen.push(...res.body.blogs.map((b) => b.id));
        cursor = res.body.nextCursor;
      } while (cursor !== null);
      const newestFirst = [twins[4], twins[3], twins[2], ...[twins[0], twins[1]].sort().reverse()];
      assert.deepEqual(seen, newestFirst, `limit=${limit}`);
    }
  });

  it('validates the search parameters', async () => {
    const latestCursor = (await feed('limit=1')).nextCursor;
    const searchCursor = (await feed('q=women&limit=1')).nextCursor;
    assert.ok(latestCursor !== null && searchCursor !== null);
    for (const query of [
      'q=a',
      `q=${'a'.repeat(101)}`,
      'categories=nope',
      'categories=',
      `categories=${Array.from({ length: 11 }, () => crypto.randomUUID()).join(',')}`,
      // A cursor only fits the order it came from.
      `q=women&cursor=${latestCursor}`,
      `cursor=${searchCursor}`,
      'sort=oldest',
    ]) {
      const res = await app.get(`/blogs?${query}`);
      assert.equal(res.status, 400, query);
      assert.equal(res.body.error.code, 'VALIDATION_FAILED');
    }
  });

  it('rate-limits searching separately from plain paging', async () => {
    const limited = await startTestApp({ db: t.db });
    try {
      for (let i = 0; i < 60; i++) {
        assert.equal((await limited.get(`/blogs?q=women`)).status, 200);
      }
      assert.equal((await limited.get('/blogs?q=women')).status, 429);
      assert.equal((await limited.get(`/blogs?categories=${cat.tech}`)).status, 429);
      assert.equal((await limited.get('/blogs')).status, 200);
    } finally {
      await limited.close();
    }
  });
});
