import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import type { Category } from '../../src/features/categories/categories.service.ts';
import type { ReferralsDto } from '../../src/features/referrals/referrals.service.ts';
import type { ProfileCardDto } from '../../src/features/members/members.service.ts';
import { createTestDatabase, skipWithoutDatabase, type TestDatabase } from '../support/database.ts';
import { insertUser, type TestUser } from '../support/fixtures.ts';
import { startTestApp, type TestApp } from '../support/testApp.ts';
import { createTokenKit } from '../support/tokens.ts';

describe('GET /categories, /users/:id and /me/referrals', { skip: skipWithoutDatabase }, () => {
  let t: TestDatabase;
  let app: TestApp;
  let tokens: Awaited<ReturnType<typeof createTokenKit>>;
  let admin: TestUser;
  let member: TestUser;
  let ambassador: TestUser;
  let pending: TestUser;

  before(async () => {
    t = await createTestDatabase();
    tokens = await createTokenKit();
    app = await startTestApp({ db: t.db, verifyAccessToken: tokens.verifyAccessToken });

    // admin (root) → member, ambassador; member → pending, suspended
    admin = await insertUser(t.db, { role: 'admin' });
    member = await insertUser(t.db, { referredBy: admin });
    ambassador = await insertUser(t.db, {
      role: 'ambassador',
      categories: ['Legal'],
      referredBy: admin,
    });
    pending = await insertUser(t.db, { status: 'pending', referredBy: member });
    await insertUser(t.db, { status: 'suspended', role: 'ambassador', referredBy: member });
  });
  after(async () => {
    await app.close();
    await t.drop();
  });

  it('lists categories alphabetically, each with its colour', async () => {
    const res = await app.get<{ categories: Category[] }>('/categories');
    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.categories.map((c) => [c.name, c.color]),
      [
        ['Entrepreneurship', 'orange'],
        ['Finance', 'green'],
        ['Health', 'pink'],
        ['Legal', 'black'],
        ['Tech', 'blue'],
      ],
    );
  });

  it('shows the public subset of an approved user, and nothing else', async () => {
    const res = await app.get<{ user: ProfileCardDto }>(`/users/${ambassador.id}`);
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(res.body.user).sort(), [
      'avatarUrl',
      'categories',
      'id',
      'name',
      'occupation',
      'role',
    ]);
    assert.deepEqual(
      res.body.user.categories.map((a) => a.name),
      ['Legal'],
    );
  });

  it('answers 404 for unapproved, unknown and malformed ids alike', async () => {
    for (const id of [pending.id, crypto.randomUUID(), 'not-a-uuid']) {
      const res = await app.get(`/users/${id}`);
      assert.equal(res.status, 404);
      assert.equal(res.body.error.code, 'NOT_FOUND');
    }
  });

  it("lists a member's own referrals with counts by status and role", async () => {
    const res = await app.get<ReferralsDto>('/me/referrals', await tokens.sign(member.id));
    assert.equal(res.status, 200);
    assert.equal(res.body.referrals.length, 2);
    assert.ok(res.body.referrals.every((r) => r.referredBy.id === member.id));
    assert.deepEqual(res.body.counts, {
      total: 2,
      byStatus: { pending: 1, approved: 0, rejected: 0, suspended: 1 },
      byRole: { member: 1, ambassador: 1, admin: 0 },
    });
    assert.equal(res.body.nextCursor, null);
  });

  it('shows an admin only their own referrals, page by page', async () => {
    const token = await tokens.sign(admin.id);
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const query: string = cursor === null ? '' : `&cursor=${cursor}`;
      const res: { status: number; body: ReferralsDto } = await app.get<ReferralsDto>(
        `/me/referrals?limit=1${query}`,
        token,
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.counts.total, 2);
      seen.push(...res.body.referrals.map((r) => r.id));
      cursor = res.body.nextCursor;
    } while (cursor !== null);

    assert.deepEqual(seen.sort(), [member.id, ambassador.id].sort());
  });

  it('refuses pending accounts and visitors', async () => {
    assert.equal((await app.get('/me/referrals')).status, 401);
    assert.equal((await app.get('/me/referrals', await tokens.sign(pending.id))).status, 403);
  });

  it('rejects a tampered cursor', async () => {
    const res = await app.get('/me/referrals?cursor=bm9wZQ', await tokens.sign(admin.id));
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_FAILED');
  });
});
