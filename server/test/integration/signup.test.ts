import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';

import { sql } from 'kysely';

import { isWellFormedReferralCode } from '../../src/lib/referralCode.ts';
import { createTestDatabase, skipWithoutDatabase, type TestDatabase } from '../support/database.ts';
import { createFakeIdentity } from '../support/fakeIdentity.ts';
import { categoryId, insertUser, uniqueEmail, type TestUser } from '../support/fixtures.ts';
import { startTestApp, type TestApp } from '../support/testApp.ts';

describe(
  'POST /auth/signup and /auth/referral-codes/validate',
  { skip: skipWithoutDatabase },
  () => {
    let t: TestDatabase;
    let referrer: TestUser;
    let app: TestApp;
    let fake: ReturnType<typeof createFakeIdentity>;

    before(async () => {
      t = await createTestDatabase();
    });
    after(async () => {
      await t.drop();
    });

    beforeEach(async () => {
      await t.reset();
      referrer = await insertUser(t.db, { role: 'admin', name: 'Referrer' });
      fake = createFakeIdentity(t.db);
      app = await startTestApp({ db: t.db, identity: fake.identity });
    });
    afterEach(async () => {
      await app.close();
    });

    function memberInput(overrides: Record<string, unknown> = {}) {
      return {
        referralCode: referrer.code,
        email: uniqueEmail(),
        password: 'correct horse battery',
        name: '  Aditi   Vyas ',
        phoneNumber: '+91 98765-43210',
        occupation: 'Product Manager',
        appliedRole: 'member',
        ...overrides,
      };
    }

    async function profileByEmail(email: string) {
      return t.db
        .selectFrom('users')
        .innerJoin(
          sql<{ id: string; email: string }>`auth.users`.as('au'),
          'au.id',
          'users.user_id',
        )
        .leftJoin('referral_codes', 'referral_codes.user_id', 'users.user_id')
        .select([
          'users.user_id',
          'users.name',
          'users.phone_number',
          'users.role',
          'users.status',
          'users.referral_code_id',
          'referral_codes.code',
        ])
        .where('au.email', '=', email)
        .executeTakeFirst();
    }

    async function countRows(table: 'users' | 'user_categories' | 'referral_codes') {
      const row = await t.db
        .selectFrom(table)
        .select(sql<number>`count(*)::int`.as('n'))
        .executeTakeFirstOrThrow();
      return row.n;
    }

    it('creates a pending member with normalized details and their own code', async () => {
      const input = memberInput();
      const res = await app.post<{ status: string }>('/auth/signup', input);

      assert.equal(res.status, 202);
      assert.deepEqual(res.body, { status: 'received' });
      const profile = await profileByEmail(input.email);
      assert.ok(profile);
      assert.equal(profile.status, 'pending');
      assert.equal(profile.role, 'member');
      assert.equal(profile.name, 'Aditi Vyas');
      assert.equal(profile.phone_number, '+919876543210');
      assert.equal(profile.referral_code_id, referrer.referralCodeId);
      assert.ok(profile.code !== null && isWellFormedReferralCode(profile.code));
    });

    it('creates an ambassador with their categories', async () => {
      const chosen = [await categoryId(t.db, 'Tech'), await categoryId(t.db, 'Legal')];
      const input = memberInput({ appliedRole: 'ambassador', categoryIds: chosen });
      const res = await app.post('/auth/signup', input);

      assert.equal(res.status, 202);
      const profile = await profileByEmail(input.email);
      assert.ok(profile);
      assert.equal(profile.role, 'ambassador');
      const saved = await t.db
        .selectFrom('user_categories')
        .select('cat_id')
        .where('user_id', '=', profile.user_id)
        .execute();
      assert.deepEqual(saved.map((r) => r.cat_id).sort(), [...chosen].sort());
    });

    it('accepts the code in lower case with a separator', async () => {
      const code = `${referrer.code.slice(0, 5)}-${referrer.code.slice(5)}`.toLowerCase();
      const res = await app.post('/auth/signup', memberInput({ referralCode: code }));
      assert.equal(res.status, 202);
    });

    it('rejects an unknown or malformed code with one generic error, creating nothing', async () => {
      const unknown = await app.post('/auth/signup', memberInput({ referralCode: 'ABCDEFGHJK' }));
      const malformed = await app.post('/auth/signup', memberInput({ referralCode: 'nope' }));

      for (const res of [unknown, malformed]) {
        assert.equal(res.status, 400);
        assert.equal(res.body.error.code, 'INVALID_REFERRAL_CODE');
        assert.equal(res.body.error.message, 'This referral code is not valid.');
      }
      assert.deepEqual(fake.calls.created, []);
      assert.equal(await countRows('users'), 1);
    });

    it('rejects a code whose owner is suspended or not yet approved', async () => {
      const suspended = await insertUser(t.db, { status: 'suspended', referredBy: referrer });
      const pending = await insertUser(t.db, { status: 'pending', referredBy: referrer });

      for (const owner of [suspended, pending]) {
        const res = await app.post('/auth/signup', memberInput({ referralCode: owner.code }));
        assert.equal(res.status, 400);
        assert.equal(res.body.error.code, 'INVALID_REFERRAL_CODE');
      }
      assert.deepEqual(fake.calls.created, []);
    });

    it('answers a duplicate email exactly like a success and creates nothing', async () => {
      const usersBefore = await countRows('users');
      const res = await app.post<{ status: string }>(
        '/auth/signup',
        memberInput({ email: referrer.email.toUpperCase() }),
      );

      assert.equal(res.status, 202);
      assert.deepEqual(res.body, { status: 'received' });
      assert.equal(await countRows('users'), usersBefore);
      assert.deepEqual(fake.calls.deleted, []);
    });

    it('rolls everything back, including the Auth user, when the transaction fails', async () => {
      // Fail at the last step (issuing the new user's own code), after the profile
      // and categories were already written inside the transaction.
      await sql`
      create function public.test_fail() returns trigger language plpgsql as
      $$ begin raise exception 'simulated failure'; end; $$;
      create trigger test_fail before insert on public.referral_codes
      for each row execute function public.test_fail();
    `.execute(t.db);
      try {
        const input = memberInput({
          appliedRole: 'ambassador',
          categoryIds: [await categoryId(t.db, 'Finance')],
        });
        const usersBefore = await countRows('users');
        const res = await app.post('/auth/signup', input);

        assert.equal(res.status, 500);
        assert.equal(res.body.error.code, 'INTERNAL');
        assert.doesNotMatch(JSON.stringify(res.body), /simulated|stack/i);
        assert.equal(await countRows('users'), usersBefore);
        assert.equal(await countRows('user_categories'), 0);
        assert.equal(fake.calls.created.length, 1);
        assert.deepEqual(fake.calls.deleted, fake.calls.created);
        const { rows } = await sql`select 1 from auth.users where email = ${input.email}`.execute(
          t.db,
        );
        assert.equal(rows.length, 0);
      } finally {
        await sql`drop trigger test_fail on public.referral_codes; drop function public.test_fail();`.execute(
          t.db,
        );
      }
    });

    it('reports invalid fields without creating an Auth user', async () => {
      const res = await app.post(
        '/auth/signup',
        memberInput({ appliedRole: 'ambassador', phoneNumber: '98765', password: 'short' }),
      );

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_FAILED');
      assert.deepEqual(Object.keys(res.body.error.fields ?? {}).sort(), [
        'categoryIds',
        'password',
        'phoneNumber',
      ]);
      assert.deepEqual(fake.calls.created, []);
    });

    it('rejects categories for members, more than two, and unknown ones', async () => {
      const tech = await categoryId(t.db, 'Tech');
      const finance = await categoryId(t.db, 'Finance');
      const legal = await categoryId(t.db, 'Legal');
      const cases = [
        memberInput({ categoryIds: [tech] }),
        memberInput({ appliedRole: 'ambassador', categoryIds: [tech, finance, legal] }),
        memberInput({ appliedRole: 'ambassador', categoryIds: [tech, tech] }),
        memberInput({ appliedRole: 'ambassador', categoryIds: [crypto.randomUUID()] }),
      ];
      for (const input of cases) {
        const res = await app.post('/auth/signup', input);
        assert.equal(res.status, 400);
        assert.ok(res.body.error.fields?.categoryIds, JSON.stringify(res.body));
      }
      assert.deepEqual(fake.calls.created, []);
    });

    it('validates codes with a bare boolean', async () => {
      const suspended = await insertUser(t.db, { status: 'suspended', referredBy: referrer });
      const check = async (code: string) =>
        (await app.post<{ valid: boolean }>('/auth/referral-codes/validate', { code })).body;

      assert.deepEqual(await check(referrer.code.toLowerCase()), { valid: true });
      assert.deepEqual(await check('ABCDEFGHJK'), { valid: false });
      assert.deepEqual(await check(suspended.code), { valid: false });
      assert.deepEqual(await check('!'), { valid: false });
    });

    it('shares one rate limit across code validation and signup', async () => {
      for (let i = 0; i < 5; i++) {
        await app.post('/auth/referral-codes/validate', { code: 'ABCDEFGHJK' });
        await app.post('/auth/signup', memberInput({ referralCode: 'ABCDEFGHJK' }));
      }
      const res = await app.post('/auth/referral-codes/validate', { code: referrer.code });
      assert.equal(res.status, 429);
      assert.equal(res.body.error.code, 'RATE_LIMITED');
    });

    it('rejects unknown fields with the standard error shape', async () => {
      const extra = await app.post('/auth/signup', { ...memberInput(), role: 'admin' });
      assert.equal(extra.status, 400);
      assert.equal(extra.body.error.code, 'VALIDATION_FAILED');
      assert.equal(typeof extra.body.error.requestId, 'string');
    });
  },
);
