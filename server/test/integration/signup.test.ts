import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';

import { sql } from 'kysely';

import { isWellFormedReferralCode } from '../../src/lib/referralCode.ts';
import { createTestDatabase, skipWithoutDatabase, type TestDatabase } from '../support/database.ts';
import { createFakeIdentity } from '../support/fakeIdentity.ts';
import {
  applicationInput,
  categoryId,
  insertUser,
  uniqueEmail,
  type TestUser,
} from '../support/fixtures.ts';
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
      return applicationInput({
        referralCode: referrer.code,
        email: uniqueEmail(),
        password: 'correct horse battery',
        ...overrides,
      });
    }

    /** An ambassador's extra answers: categories and weekly hours. */
    async function ambassadorInput(overrides: Record<string, unknown> = {}) {
      return memberInput({
        appliedRole: 'ambassador',
        categoryIds: [await categoryId(t.db, 'Finance')],
        weeklyHours: '3_5',
        ...overrides,
      });
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

    it('stores every application answer, normalized', async () => {
      const input = memberInput({
        maidenName: '  Mehta ',
        jodhpurConnections: ['grew_up_here', 'other'],
        connectionOther: '  My grandparents  live there ',
        journeyStage: 'student',
        journeyStageOther: 'ignored unless Other is chosen',
        joinReasons: ['give_back'],
        linkedinUrl: 'http://www.LinkedIn.com/in/aditi#top',
        password: 'six666',
      });
      assert.equal((await app.post('/auth/signup', input)).status, 202);
      const profile = await profileByEmail(input.email);
      assert.ok(profile);

      const row = await t.db
        .selectFrom('users')
        .leftJoin('journey_stages as js', 'js.journey_stage_id', 'users.journey_stage_id')
        .select([
          'maiden_name',
          'city',
          'state',
          'country_code',
          'school_pass_year',
          'school_name',
          'college_pass_year',
          'college_name',
          'highest_degree',
          'profession',
          'occupation',
          'linkedin_url',
          'connection_other',
          'journey_stage_other',
          'join_reason_other',
          'weekly_hours_id',
          'js.code as journey_stage',
        ])
        .where('user_id', '=', profile.user_id)
        .executeTakeFirstOrThrow();
      assert.deepEqual(row, {
        maiden_name: 'Mehta',
        city: 'Pune',
        state: 'Maharashtra',
        country_code: 'IN',
        school_pass_year: 2008,
        school_name: 'St. Patrick’s Vidya Bhawan',
        college_pass_year: 'NA',
        college_name: null,
        highest_degree: 'NA',
        profession: 'Technology',
        occupation: 'Product Manager',
        linkedin_url: 'https://www.linkedin.com/in/aditi',
        connection_other: 'My grandparents live there',
        journey_stage_other: null,
        join_reason_other: null,
        weekly_hours_id: null,
        journey_stage: 'student',
      });

      const connections = await t.db
        .selectFrom('user_jodhpur_connections as u')
        .innerJoin('jodhpur_connections as o', 'o.connection_id', 'u.connection_id')
        .select('o.code')
        .where('u.user_id', '=', profile.user_id)
        .orderBy('o.code')
        .execute();
      assert.deepEqual(
        connections.map((r) => r.code),
        ['grew_up_here', 'other'],
      );
      const reasons = await t.db
        .selectFrom('user_join_reasons as u')
        .innerJoin('join_reasons as o', 'o.join_reason_id', 'u.join_reason_id')
        .select('o.code')
        .where('u.user_id', '=', profile.user_id)
        .execute();
      assert.deepEqual(
        reasons.map((r) => r.code),
        ['give_back'],
      );
    });

    it('requires the answers, "Other" text when Other is chosen, and valid formats', async () => {
      const cases: [Record<string, unknown>, string][] = [
        [{ city: '  ' }, 'city'],
        [{ country: 'XX' }, 'country'],
        [{ phoneNumber: '+91 12345' }, 'phoneNumber'],
        [{ jodhpurConnections: [] }, 'jodhpurConnections'],
        [{ jodhpurConnections: ['other'] }, 'connectionOther'],
        [{ journeyStage: 'other' }, 'journeyStageOther'],
        [{ joinReasons: ['other'], joinReasonOther: '   ' }, 'joinReasonOther'],
        [{ schoolPassYear: 1820 }, 'schoolPassYear'],
        [{ schoolPassYear: undefined }, 'schoolPassYear'],
        [{ collegePassYear: null }, 'collegePassYear'],
        [{ collegePassYear: 'soon' }, 'collegePassYear'],
        [{ highestDegree: '' }, 'highestDegree'],
        [{ profession: '' }, 'profession'],
        [{ linkedinUrl: 'https://evil.example.com/in/aditi' }, 'linkedinUrl'],
        [{ linkedinUrl: 'https://linkedin.com.evil.io/in/x' }, 'linkedinUrl'],
        [{ journeyStage: 'astronaut' }, 'journeyStage'],
        [{ joinReasons: ['network', 'network'] }, 'joinReasons'],
        [{ weeklyHours: '3_5' }, 'weeklyHours'],
      ];
      for (const [overrides, field] of cases) {
        // A fresh app per case: sign-up shares the tight referral-attempt rate limit.
        const local = await startTestApp({ db: t.db, identity: fake.identity });
        try {
          const res = await local.post('/auth/signup', memberInput(overrides));
          assert.equal(res.status, 400, JSON.stringify(overrides));
          assert.ok(res.body.error.fields?.[field], `${field}: ${JSON.stringify(res.body)}`);
        } finally {
          await local.close();
        }
      }
      assert.deepEqual(fake.calls.created, []);
    });

    it('refuses option codes that are retired, field by field', async () => {
      await t.db
        .updateTable('journey_stages')
        .set({ active: false })
        .where('code', '=', 'retired')
        .execute();
      try {
        const res = await app.post('/auth/signup', memberInput({ journeyStage: 'retired' }));
        assert.equal(res.status, 400);
        assert.deepEqual(Object.keys(res.body.error.fields ?? {}), ['journeyStage']);
        assert.deepEqual(fake.calls.created, []);
      } finally {
        await t.db
          .updateTable('journey_stages')
          .set({ active: true })
          .where('code', '=', 'retired')
          .execute();
      }
    });

    it('creates an ambassador with up to three categories and her weekly hours', async () => {
      const chosen = [
        await categoryId(t.db, 'Tech'),
        await categoryId(t.db, 'Legal'),
        await categoryId(t.db, 'Health'),
      ];
      const input = await ambassadorInput({ categoryIds: chosen, weeklyHours: '10_plus' });
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
      const hours = await t.db
        .selectFrom('users')
        .innerJoin('weekly_hours_options as w', 'w.weekly_hours_id', 'users.weekly_hours_id')
        .select('w.code')
        .where('user_id', '=', profile.user_id)
        .executeTakeFirstOrThrow();
      assert.equal(hours.code, '10_plus');
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

    it('rejects a code whose owner is suspended, rejected or not yet approved', async () => {
      const suspended = await insertUser(t.db, { status: 'suspended', referredBy: referrer });
      const pending = await insertUser(t.db, { status: 'pending', referredBy: referrer });
      const rejected = await insertUser(t.db, { status: 'rejected', referredBy: referrer });

      for (const owner of [suspended, pending, rejected]) {
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
        const input = await ambassadorInput();
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
        memberInput({ appliedRole: 'ambassador', phoneNumber: '98765', password: 'five5' }),
      );

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_FAILED');
      assert.deepEqual(Object.keys(res.body.error.fields ?? {}).sort(), [
        'categoryIds',
        'password',
        'phoneNumber',
        'weeklyHours',
      ]);
      assert.deepEqual(fake.calls.created, []);
    });

    it('rejects categories for members, more than three, and unknown ones', async () => {
      const tech = await categoryId(t.db, 'Tech');
      const finance = await categoryId(t.db, 'Finance');
      const legal = await categoryId(t.db, 'Legal');
      const health = await categoryId(t.db, 'Health');
      const cases = [
        memberInput({ categoryIds: [tech] }),
        await ambassadorInput({ categoryIds: [tech, finance, legal, health] }),
        await ambassadorInput({ categoryIds: [tech, tech] }),
        await ambassadorInput({ categoryIds: [crypto.randomUUID()] }),
        await ambassadorInput({ categoryIds: [] }),
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
