import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import type {
  MemberSummaryDto,
  PublicProfileDto,
} from '../../src/features/members/members.service.ts';
import { createTestDatabase, skipWithoutDatabase, type TestDatabase } from '../support/database.ts';
import { insertUser, type TestUser } from '../support/fixtures.ts';
import { startTestApp, type TestApp, type TestResponse } from '../support/testApp.ts';
import { createTokenKit } from '../support/tokens.ts';

interface DirectoryPage {
  members: MemberSummaryDto[];
  nextCursor: string | null;
  counts: { admin: number; ambassador: number; member: number };
}

describe('member directory', { skip: skipWithoutDatabase }, () => {
  let t: TestDatabase;
  let app: TestApp;
  let tokens: Awaited<ReturnType<typeof createTokenKit>>;
  let viewer: TestUser;
  let pending: TestUser;
  let rejected: TestUser;
  let suspended: TestUser;
  /** Approved users in the order the directory must list them. */
  let expected: TestUser[];

  before(async () => {
    t = await createTestDatabase();
    tokens = await createTokenKit();
    app = await startTestApp({ db: t.db, verifyAccessToken: tokens.verifyAccessToken });

    const add = (role: 'member' | 'ambassador' | 'admin', name: string) =>
      insertUser(t.db, {
        role,
        name,
        ...(role === 'ambassador' && { categories: ['Tech'] }),
      });
    // Inserted out of order, with case differences and exact name ties.
    const members = [
      await add('member', 'zara'),
      await add('member', 'Asha'),
      await add('member', 'asha'),
      await add('member', 'Asha'),
      await add('member', 'Bina'),
    ];
    const ambassadors = [await add('ambassador', 'Tara'), await add('ambassador', 'meera')];
    const admins = [await add('admin', 'Neha'), await add('admin', 'divya')];
    pending = await insertUser(t.db, { status: 'pending', name: 'Aaa Pending' });
    rejected = await insertUser(t.db, { status: 'rejected', name: 'Aaa Rejected' });
    suspended = await insertUser(t.db, { status: 'suspended', name: 'Aaa Suspended' });

    // Within a role: lowercased name, then id (uuids compare like their hex text).
    const byName = (a: TestUser, b: TestUser) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase(), 'en') || (a.id < b.id ? -1 : 1);
    expected = [...admins.sort(byName), ...ambassadors.sort(byName), ...members.sort(byName)];
    const [first] = members;
    assert.ok(first);
    viewer = first;
  });
  after(async () => {
    await app.close();
    await t.drop();
  });

  async function readAll(limit: number): Promise<string[]> {
    const token = await tokens.sign(viewer.id);
    const ids: string[] = [];
    let cursor: string | null = null;
    do {
      const query: string = cursor === null ? '' : `&cursor=${cursor}`;
      const res: TestResponse<DirectoryPage> = await app.get(
        `/members?limit=${limit}${query}`,
        token,
      );
      assert.equal(res.status, 200);
      assert.ok(res.body.members.length <= limit);
      ids.push(...res.body.members.map((m) => m.id));
      cursor = res.body.nextCursor;
    } while (cursor !== null);
    return ids;
  }

  it('lists approved users only: admins, then ambassadors, then members, each by name', async () => {
    const ids = await readAll(50);
    assert.deepEqual(
      ids,
      expected.map((u) => u.id),
    );
    for (const hidden of [pending, rejected, suspended]) assert.ok(!ids.includes(hidden.id));
  });

  it('pages without gaps or repeats at every page size, ties included', async () => {
    for (const limit of [1, 2, 3, 4]) {
      assert.deepEqual(
        await readAll(limit),
        expected.map((u) => u.id),
        `limit=${limit}`,
      );
    }
  });

  it('returns just what a row needs', async () => {
    const res = await app.get<DirectoryPage>('/members?limit=1', await tokens.sign(viewer.id));
    assert.deepEqual(Object.keys(res.body.members[0] ?? {}).sort(), [
      'avatarUrl',
      'id',
      'name',
      'occupation',
      'role',
    ]);
  });

  it('is for approved members only', async () => {
    assert.equal((await app.get('/members')).status, 401);
    assert.equal((await app.get(`/members/${viewer.id}`)).status, 401);
    for (const user of [pending, suspended]) {
      const token = await tokens.sign(user.id);
      assert.equal((await app.get('/members', token)).status, 403);
      assert.equal((await app.get(`/members/${viewer.id}`, token)).status, 403);
    }
  });

  it('shows the full profile, email included, of approved users only', async () => {
    const token = await tokens.sign(viewer.id);
    const ambassador = expected.find((u) => u.name === 'Tara');
    assert.ok(ambassador);
    const res = await app.get<{ member: PublicProfileDto }>(`/members/${ambassador.id}`, token);
    assert.equal(res.status, 200);
    assert.equal(res.body.member.email, ambassador.email);
    assert.equal(res.body.member.phoneNumber, '+919876543210');
    assert.equal(res.body.member.role, 'ambassador');
    assert.deepEqual(
      res.body.member.categories.map((c) => c.name),
      ['Tech'],
    );

    for (const id of [pending.id, rejected.id, suspended.id, crypto.randomUUID(), 'not-a-uuid']) {
      const missing = await app.get(`/members/${id}`, token);
      assert.equal(missing.status, 404);
      assert.equal(missing.body.error.code, 'NOT_FOUND');
    }
  });

  it('counts each role across all pages', async () => {
    const res = await app.get<DirectoryPage>('/members?limit=1', await tokens.sign(viewer.id));
    assert.deepEqual(res.body.counts, { admin: 2, ambassador: 2, member: 5 });
  });

  it('searches names and occupations and filters roles, in the same order', async () => {
    const token = await tokens.sign(viewer.id);
    const names = async (query: string) => {
      const res = await app.get<DirectoryPage>(`/members?${query}`, token);
      assert.equal(res.status, 200, query);
      return { names: res.body.members.map((m) => m.name), counts: res.body.counts };
    };
    // "asha" in any case, never the pending "Aaa Pending".
    assert.deepEqual(await names('q=ASHA'), {
      names: expected.filter((u) => u.name.toLowerCase() === 'asha').map((u) => u.name),
      counts: { admin: 0, ambassador: 0, member: 3 },
    });
    // Occupation matches too (every fixture user is an "Engineer").
    assert.equal((await names('q=engin')).names.length, expected.length);
    assert.deepEqual((await names('roles=ambassador,admin')).names, [
      'divya',
      'Neha',
      'meera',
      'Tara',
    ]);
    assert.deepEqual((await names('q=ra&roles=ambassador')).names, ['meera', 'Tara']);
    assert.deepEqual(await names('q=zzzz'), {
      names: [],
      counts: { admin: 0, ambassador: 0, member: 0 },
    });
    // LIKE wildcards are taken literally.
    assert.deepEqual((await names(`q=${encodeURIComponent('%_')}`)).names, []);
  });

  it('pages through a filtered directory without gaps or repeats', async () => {
    const token = await tokens.sign(viewer.id);
    const ids: string[] = [];
    let cursor: string | null = null;
    do {
      const query: string = cursor === null ? '' : `&cursor=${cursor}`;
      const res: TestResponse<DirectoryPage> = await app.get(
        `/members?q=as&roles=member&limit=1${query}`,
        token,
      );
      ids.push(...res.body.members.map((m) => m.id));
      cursor = res.body.nextCursor;
    } while (cursor !== null);
    assert.deepEqual(
      ids,
      expected.filter((u) => u.name.toLowerCase() === 'asha').map((u) => u.id),
    );
  });

  it('tells anyone how many approved people the community has', async () => {
    const res = await app.get<{ count: number }>('/members/count');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { count: expected.length });
  });

  it("shows a member's blogs and comments on their profile, to approved members only", async () => {
    const author = expected[0];
    assert.ok(author);
    const token = await tokens.sign(viewer.id);
    for (const kind of ['blogs', 'comments']) {
      const res: TestResponse<{ nextCursor: string | null }> = await app.get(
        `/members/${author.id}/${kind}?limit=2`,
        token,
      );
      assert.equal(res.status, 200, kind);
      assert.equal(res.body.nextCursor, null);
      assert.equal((await app.get(`/members/${author.id}/${kind}`)).status, 401);
      const pendingToken = await tokens.sign(pending.id);
      assert.equal((await app.get(`/members/${author.id}/${kind}`, pendingToken)).status, 403);
      assert.equal((await app.get(`/members/not-a-uuid/${kind}`, token)).status, 404);
    }
  });

  it('validates search and role filters', async () => {
    const token = await tokens.sign(viewer.id);
    for (const query of ['q=a', `q=${'a'.repeat(101)}`, 'roles=owner', 'roles=', 'roles=admin,x']) {
      assert.equal((await app.get(`/members?${query}`, token)).status, 400, query);
    }
  });

  it('rejects malformed and tampered cursors and page sizes', async () => {
    const token = await tokens.sign(viewer.id);
    const forged = Buffer.from(JSON.stringify({ k: 9, n: 'a', id: viewer.id })).toString(
      'base64url',
    );
    for (const query of ['cursor=bm9wZQ', `cursor=${forged}`, 'limit=0', 'limit=51', 'sort=name']) {
      assert.equal((await app.get(`/members?${query}`, token)).status, 400, query);
    }
  });
});
