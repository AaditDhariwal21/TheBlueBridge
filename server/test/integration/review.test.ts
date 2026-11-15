import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';

import type {
  AdminMemberDto,
  PublicProfileDto,
} from '../../src/features/members/members.service.ts';
import type { ProfileOptionsDto } from '../../src/features/profileOptions/profileOptions.service.ts';
import type { MeDto } from '../../src/features/users/users.service.ts';
import { createTestDatabase, skipWithoutDatabase, type TestDatabase } from '../support/database.ts';
import { applicationInput, categoryId, insertUser, type TestUser } from '../support/fixtures.ts';
import { startTestApp, type TestApp } from '../support/testApp.ts';
import { createTokenKit } from '../support/tokens.ts';

/**
 * Reviewing applications with a note, rejecting, reapplying, and the expanded profile as
 * the member, other members and admins see it.
 */
describe('application review, reapply and profile details', { skip: skipWithoutDatabase }, () => {
  let t: TestDatabase;
  let app: TestApp;
  let tokens: Awaited<ReturnType<typeof createTokenKit>>;
  let tech: string;
  let finance: string;
  let legal: string;
  let admin: TestUser;
  let applicant: TestUser;

  before(async () => {
    t = await createTestDatabase();
    tokens = await createTokenKit();
    tech = await categoryId(t.db, 'Tech');
    finance = await categoryId(t.db, 'Finance');
    legal = await categoryId(t.db, 'Legal');
  });
  after(async () => {
    await t.drop();
  });
  beforeEach(async () => {
    await t.reset();
    admin = await insertUser(t.db, { role: 'admin', name: 'Root Admin' });
    applicant = await insertUser(t.db, { status: 'pending', name: 'Priya', referredBy: admin });
    app = await startTestApp({ db: t.db, verifyAccessToken: tokens.verifyAccessToken });
  });
  afterEach(async () => {
    await app.close();
  });

  const as = (user: TestUser) => tokens.sign(user.id);
  const me = async (user: TestUser) =>
    (await app.get<{ user: MeDto }>('/me', await as(user))).body.user;
  const review = async (decision: 'approve' | 'reject', body: unknown, user = applicant) =>
    app.post<AdminMemberDto>(`/admin/members/${user.id}/${decision}`, body, await as(admin));
  const reapply = async (body: unknown, user = applicant) =>
    app.post<{ user: MeDto }>('/me/reapply', body, await as(user));

  it('lists the application choices publicly, in order', async () => {
    const res = await app.get<{ options: ProfileOptionsDto }>('/profile-options');
    assert.equal(res.status, 200);
    const { options } = res.body;
    assert.equal(options.jodhpurConnections[0]?.code, 'born_here');
    assert.equal(options.jodhpurConnections.at(-1)?.code, 'other');
    assert.equal(options.journeyStages.length, 9);
    assert.equal(options.joinReasons.length, 7);
    assert.deepEqual(
      options.weeklyHours.map((o) => o.code),
      ['1_2', '3_5', '6_10', '10_plus'],
    );
  });

  it('rejects with a required note, which the applicant sees and the log keeps', async () => {
    for (const body of [undefined, {}, { note: '   ' }, { note: 'x'.repeat(501) }]) {
      assert.equal((await review('reject', body)).status, 400, JSON.stringify(body));
    }
    const res = await review('reject', { note: '  Please tell us   about your Jodhpur roots. ' });
    assert.equal(res.status, 200);
    assert.equal(res.body.member.status, 'rejected');
    assert.equal(res.body.member.reviewNote, 'Please tell us about your Jodhpur roots.');
    assert.deepEqual(
      res.body.history.map((e) => [e.action, e.reason, e.admin.name]),
      [['member_rejected', 'Please tell us about your Jodhpur roots.', 'Root Admin']],
    );

    const mine = await me(applicant);
    assert.equal(mine.status, 'rejected');
    assert.equal(mine.reviewNote, 'Please tell us about your Jodhpur roots.');
    // A decided application can't be decided again.
    assert.equal((await review('reject', { note: 'Again' })).status, 409);
    assert.equal((await review('approve', {})).status, 409);
  });

  it('approves with an optional note shown on the member’s own profile only', async () => {
    const res = await review('approve', { note: 'Welcome aboard!' });
    assert.equal(res.status, 200);
    assert.equal((await me(applicant)).reviewNote, 'Welcome aboard!');
    // Other members never see it.
    const profile = await app.get<{ member: PublicProfileDto & { reviewNote?: unknown } }>(
      `/members/${applicant.id}`,
      await as(admin),
    );
    assert.equal(profile.status, 200);
    assert.equal('reviewNote' in profile.body.member, false);

    const other = await insertUser(t.db, { status: 'pending' });
    assert.equal((await review('approve', undefined, other)).status, 200);
    assert.equal((await me(other)).reviewNote, null);
  });

  it('lets only a rejected applicant reapply', async () => {
    const body = applicationInput({});
    assert.equal((await app.post('/me/reapply', body)).status, 401);
    assert.equal((await reapply(body)).status, 409); // pending
    assert.equal((await reapply(body, admin)).status, 409); // approved
    const suspended = await insertUser(t.db, { status: 'suspended' });
    assert.equal((await reapply(body, suspended)).status, 409);
  });

  it('reapplies as an ambassador, then as a member, replacing everything atomically', async () => {
    await review('reject', { note: 'Not enough detail.' });

    // Invalid: nothing changes.
    const invalid = await app.post(
      '/me/reapply',
      applicationInput({ appliedRole: 'ambassador', categoryIds: [tech], weeklyHours: null }),
      await as(applicant),
    );
    assert.equal(invalid.status, 400);
    assert.ok(invalid.body.error.fields?.weeklyHours);
    assert.equal((await me(applicant)).status, 'rejected');

    const asAmbassador = await reapply(
      applicationInput({
        appliedRole: 'ambassador',
        categoryIds: [tech, finance, legal],
        weeklyHours: '6_10',
        jodhpurConnections: ['other'],
        connectionOther: 'Married into a Jodhpur family',
      }),
    );
    assert.equal(asAmbassador.status, 200, JSON.stringify(asAmbassador.body));
    const updated = asAmbassador.body.user;
    assert.equal(updated.status, 'pending');
    assert.equal(updated.role, 'ambassador');
    assert.equal(updated.reviewNote, null);
    assert.deepEqual(
      updated.categories.map((c) => c.name),
      ['Finance', 'Legal', 'Tech'],
    );
    assert.equal(updated.weeklyHours?.code, '6_10');
    assert.deepEqual(updated.jodhpurConnections, [{ code: 'other', label: 'Other' }]);
    assert.equal(updated.connectionOther, 'Married into a Jodhpur family');
    assert.equal(updated.name, 'Aditi Vyas');
    const row = await t.db
      .selectFrom('users')
      .select(['reviewed_by', 'reviewed_at'])
      .where('user_id', '=', applicant.id)
      .executeTakeFirstOrThrow();
    assert.deepEqual(row, { reviewed_by: null, reviewed_at: null });

    // Rejected again, as an ambassador; back as a member: categories and hours go.
    const second = await review('reject', { note: 'Please apply as a member first.' });
    assert.equal(second.body.history[0]?.action, 'ambassador_rejected');
    const asMember = await reapply(applicationInput({ jodhpurConnections: ['live_here'] }));
    assert.equal(asMember.status, 200);
    assert.equal(asMember.body.user.role, 'member');
    assert.deepEqual(asMember.body.user.categories, []);
    assert.equal(asMember.body.user.weeklyHours, null);
    assert.equal(asMember.body.user.connectionOther, null);

    // The admin still sees every decision and note, newest first.
    const record = await app.get<AdminMemberDto>(`/admin/members/${applicant.id}`, await as(admin));
    assert.deepEqual(
      record.body.history.map((e) => [e.action, e.reason]),
      [
        ['ambassador_rejected', 'Please apply as a member first.'],
        ['member_rejected', 'Not enough detail.'],
      ],
    );
    assert.equal(record.body.member.status, 'pending');
  });

  it('limits reapplying per account', async () => {
    await review('reject', { note: 'Try again.' });
    let status = 0;
    for (let i = 0; i < 31 && status !== 429; i++) {
      status = (await reapply({ name: '' })).status;
    }
    assert.equal(status, 429);
  });

  it('shows the application on the member’s profile, to members and admins', async () => {
    await review('reject', { note: 'Add your school.' });
    await reapply(applicationInput({ linkedinUrl: 'www.linkedin.com/in/priya' }));
    await review('approve', {});

    const profile = await app.get<{ member: PublicProfileDto }>(
      `/members/${applicant.id}`,
      await as(admin),
    );
    const member = profile.body.member;
    assert.equal(member.city, 'Pune');
    assert.equal(member.country, 'IN');
    assert.equal(member.profession, 'Technology');
    assert.equal(member.collegePassYear, 'NA');
    assert.equal(member.linkedinUrl, 'https://www.linkedin.com/in/priya');
    assert.deepEqual(
      member.joinReasons.map((o) => o.code),
      ['network', 'mentorship'],
    );
    assert.equal(member.journeyStage?.label, 'Mid career (3–10 years)');

    // Existing members simply have none of it yet.
    const veteran = await app.get<{ member: PublicProfileDto }>(
      `/members/${admin.id}`,
      await as(admin),
    );
    assert.equal(veteran.body.member.city, null);
    assert.deepEqual(veteran.body.member.jodhpurConnections, []);
  });
});
