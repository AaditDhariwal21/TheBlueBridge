import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import type { MeDto } from '../../src/features/users/users.service.ts';
import { createTestDatabase, skipWithoutDatabase, type TestDatabase } from '../support/database.ts';
import { insertUser, type TestUser } from '../support/fixtures.ts';
import { startTestApp, type TestApp } from '../support/testApp.ts';
import { createTokenKit, signWithForeignKey } from '../support/tokens.ts';

describe('authentication (requireAuth, requireApproved)', { skip: skipWithoutDatabase }, () => {
  let t: TestDatabase;
  let app: TestApp;
  let tokens: Awaited<ReturnType<typeof createTokenKit>>;
  let approved: TestUser;
  let pending: TestUser;

  before(async () => {
    t = await createTestDatabase();
    tokens = await createTokenKit();
    app = await startTestApp({ db: t.db, verifyAccessToken: tokens.verifyAccessToken });
    approved = await insertUser(t.db, { role: 'ambassador', categories: ['Tech', 'Finance'] });
    pending = await insertUser(t.db, { status: 'pending', referredBy: approved });
  });
  after(async () => {
    await app.close();
    await t.drop();
  });

  async function expectUnauthenticated(authorization: string | undefined) {
    const res = await app.get('/me', authorization);
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHENTICATED');
  }

  it('rejects a request without a token', async () => {
    await expectUnauthenticated(undefined);
  });

  it('rejects malformed, forged, expired and wrong-audience tokens', async () => {
    await expectUnauthenticated('not-a-jwt');
    await expectUnauthenticated(await signWithForeignKey(approved.id));
    await expectUnauthenticated(await tokens.sign(approved.id, { expiresIn: '-1m' }));
    await expectUnauthenticated(await tokens.sign(approved.id, { audience: 'anon' }));
    await expectUnauthenticated(
      await tokens.sign(approved.id, { issuer: 'https://evil.supabase.co/auth/v1' }),
    );
  });

  it('rejects a valid token for an Auth user who has no profile', async () => {
    await expectUnauthenticated(await tokens.sign(crypto.randomUUID()));
  });

  it('lets a pending user read their own profile', async () => {
    const token = await tokens.sign(pending.id, { email: pending.email });
    const res = await app.get<{ user: MeDto }>('/me', token);

    assert.equal(res.status, 200);
    assert.equal(res.body.user.status, 'pending');
    assert.equal(res.body.user.email, pending.email);
  });

  it('keeps pending users out of approved-only routes', async () => {
    const res = await app.get('/me/referrals', await tokens.sign(pending.id));
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'ACCOUNT_NOT_APPROVED');
  });

  it('applies a status change on the next request, without waiting for the token to expire', async () => {
    const token = await tokens.sign(approved.id);
    assert.equal((await app.get('/me/referrals', token)).status, 200);

    await t.db
      .updateTable('users')
      .set({ status: 'suspended' })
      .where('user_id', '=', approved.id)
      .execute();
    try {
      assert.equal((await app.get('/me/referrals', token)).status, 403);
    } finally {
      await t.db
        .updateTable('users')
        .set({ status: 'approved' })
        .where('user_id', '=', approved.id)
        .execute();
    }
  });

  it('returns the complete profile to an approved user', async () => {
    const token = await tokens.sign(approved.id, { email: approved.email });
    const res = await app.get<{ user: MeDto }>('/me', token);

    assert.equal(res.status, 200);
    const { user } = res.body;
    assert.equal(user.id, approved.id);
    assert.equal(user.email, approved.email);
    assert.equal(user.phoneNumber, '+919876543210');
    assert.equal(user.role, 'ambassador');
    assert.equal(user.referralCode, approved.code);
    assert.deepEqual(
      user.categories.map((a) => a.name),
      ['Finance', 'Tech'],
    );
  });
});
