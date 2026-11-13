import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';

import type { AdminActionDto } from '../../src/features/adminLog/adminLog.service.ts';
import type { QueryBlogDto } from '../../src/features/blogs/blogs.service.ts';
import type {
  AdminMemberDto,
  AdminMemberSummaryDto,
} from '../../src/features/members/members.service.ts';
import type { ReferralsDto } from '../../src/features/referrals/referrals.service.ts';
import { createTestDatabase, skipWithoutDatabase, type TestDatabase } from '../support/database.ts';
import { categoryId, insertComment, insertUser, type TestUser } from '../support/fixtures.ts';
import { startTestApp, type TestApp, type TestResponse } from '../support/testApp.ts';
import { createTokenKit } from '../support/tokens.ts';

interface MembersPage {
  members: AdminMemberSummaryDto[];
  nextCursor: string | null;
  counts: { admin: number; ambassador: number; member: number };
}
interface LogPage {
  entries: AdminActionDto[];
  nextCursor: string | null;
}

describe('admin panel API', { skip: skipWithoutDatabase }, () => {
  let t: TestDatabase;
  let app: TestApp;
  let tokens: Awaited<ReturnType<typeof createTokenKit>>;
  let tech: string;
  let finance: string;
  let admin: TestUser;
  let secondAdmin: TestUser;
  let member: TestUser;
  let ambassador: TestUser;
  let applicant: TestUser;
  let applyingAmbassador: TestUser;

  before(async () => {
    t = await createTestDatabase();
    tokens = await createTokenKit();
    tech = await categoryId(t.db, 'Tech');
    finance = await categoryId(t.db, 'Finance');
  });
  after(async () => {
    await t.drop();
  });

  beforeEach(async () => {
    await t.reset();
    // admin (root) → secondAdmin, member, ambassador; member → applicant, applyingAmbassador
    admin = await insertUser(t.db, { role: 'admin', name: 'Root Admin' });
    secondAdmin = await insertUser(t.db, {
      role: 'admin',
      name: 'Second Admin',
      referredBy: admin,
    });
    member = await insertUser(t.db, { name: 'Meera Member', referredBy: admin });
    ambassador = await insertUser(t.db, {
      role: 'ambassador',
      categories: ['Tech'],
      name: 'Anita Ambassador',
      referredBy: admin,
    });
    applicant = await insertUser(t.db, {
      status: 'pending',
      name: 'Priya Applicant',
      referredBy: member,
    });
    applyingAmbassador = await insertUser(t.db, {
      status: 'pending',
      role: 'ambassador',
      categories: ['Finance'],
      name: 'Kavya Applicant',
      referredBy: member,
    });
    app = await startTestApp({ db: t.db, verifyAccessToken: tokens.verifyAccessToken });
  });
  afterEach(async () => {
    await app.close();
  });

  const as = (user: TestUser) => tokens.sign(user.id);

  async function logEntries(): Promise<AdminActionDto[]> {
    const res = await app.get<LogPage>('/admin/action-logs?limit=50', await as(admin));
    assert.equal(res.status, 200);
    return res.body.entries;
  }

  /* ------------------------------------------------------- authorization */

  /** Every admin endpoint, with a request that would succeed for an admin. */
  function everyEndpoint(token?: string): Promise<TestResponse<unknown>>[] {
    const queryBlog = { categoryId: tech, title: 'Tech questions', description: 'Ask about tech.' };
    return [
      app.get('/admin/overview', token),
      app.get('/admin/members', token),
      app.get(`/admin/members/${applicant.id}`, token),
      app.get(`/admin/members/${member.id}/referrals`, token),
      app.post(`/admin/members/${applicant.id}/approve`, {}, token),
      app.post('/admin/query-blogs', queryBlog, token),
      app.del(`/admin/query-blogs/${crypto.randomUUID()}`, token),
      app.get('/admin/action-logs', token),
      app.get('/admin/no-such-endpoint', token),
    ];
  }

  it('answers 401 on every admin endpoint without a valid token', async () => {
    for (const token of [undefined, 'not-a-token', await tokens.sign(crypto.randomUUID())]) {
      for (const res of await Promise.all(everyEndpoint(token))) {
        assert.equal(res.status, 401);
      }
    }
  });

  it('answers 403 on every admin endpoint to members, ambassadors and unapproved admins', async () => {
    const pendingAdmin = await insertUser(t.db, { role: 'admin', status: 'pending' });
    const suspendedAdmin = await insertUser(t.db, { role: 'admin', status: 'suspended' });
    for (const user of [member, ambassador, applicant, pendingAdmin, suspendedAdmin]) {
      for (const res of await Promise.all(everyEndpoint(await as(user)))) {
        assert.equal(res.status, 403, user.name);
        assert.equal((res.body as { error: { code: string } }).error.code, 'FORBIDDEN');
      }
    }
    // Nothing happened on the way.
    const detail = await app.get<AdminMemberDto>(`/admin/members/${applicant.id}`, await as(admin));
    assert.equal(detail.body.member.status, 'pending');
    assert.deepEqual(await logEntries(), []);
  });

  it('has a stricter per-admin rate limit', async () => {
    const token = await as(admin);
    const statuses = [];
    for (let i = 0; i < 61; i++) statuses.push((await app.get('/admin/overview', token)).status);
    assert.equal(statuses.filter((s) => s === 200).length, 60);
    assert.equal(statuses.at(-1), 429);
    // Counted per admin: another admin is unaffected.
    assert.equal((await app.get('/admin/overview', await as(secondAdmin))).status, 200);
  });

  /* ------------------------------------------------------------- members */

  it('counts pending applications by role', async () => {
    const res = await app.get<{ pending: unknown }>('/admin/overview', await as(admin));
    assert.deepEqual(res.body.pending, { total: 2, members: 1, ambassadors: 1 });
  });

  it('lists everyone by role, then name, page by page, with search and filters', async () => {
    const token = await as(admin);
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const query: string = cursor === null ? '' : `&cursor=${cursor}`;
      const res: TestResponse<MembersPage> = await app.get(`/admin/members?limit=2${query}`, token);
      assert.equal(res.status, 200);
      seen.push(...res.body.members.map((m) => m.name));
      cursor = res.body.nextCursor;
    } while (cursor !== null);
    // Admins, ambassadors, members; alphabetical in each; every status.
    assert.deepEqual(seen, [
      'Root Admin',
      'Second Admin',
      'Anita Ambassador',
      'Kavya Applicant',
      'Meera Member',
      'Priya Applicant',
    ]);
    const all = await app.get<MembersPage>('/admin/members?limit=1', token);
    assert.deepEqual(all.body.counts, { admin: 2, ambassador: 2, member: 2 });

    const names = async (query: string) =>
      (await app.get<MembersPage>(`/admin/members?${query}`, token)).body.members.map(
        (m) => m.name,
      );
    assert.deepEqual(await names('status=pending'), ['Kavya Applicant', 'Priya Applicant']);
    assert.deepEqual(await names('role=admin'), ['Root Admin', 'Second Admin']);
    assert.deepEqual(await names('status=pending&role=ambassador'), ['Kavya Applicant']);
    assert.deepEqual(await names('q=APPLI'), ['Kavya Applicant', 'Priya Applicant']);
    // LIKE wildcards in the search are taken literally.
    assert.deepEqual(await names('q=%25'), []);
    assert.deepEqual(await names('q=_'), []);

    for (const bad of ['status=rejected', 'role=owner', `q=${'x'.repeat(101)}`, 'limit=51']) {
      assert.equal((await app.get(`/admin/members?${bad}`, token)).status, 400, bad);
    }
  });

  it('shows a member with who referred them and everyone who used their code', async () => {
    const token = await as(admin);
    const res = await app.get<AdminMemberDto>(`/admin/members/${member.id}`, token);
    assert.equal(res.status, 200);
    assert.equal(res.body.member.name, 'Meera Member');
    assert.equal(res.body.member.email, member.email);
    assert.equal(res.body.member.phoneNumber, '+919876543210');
    assert.equal(res.body.member.status, 'approved');
    assert.deepEqual(res.body.referredBy, { id: admin.id, name: 'Root Admin', role: 'admin' });
    assert.equal(res.body.referrals.counts.total, 2);
    assert.deepEqual(res.body.referrals.counts.byStatus.pending, 2);
    assert.deepEqual(
      res.body.referrals.referrals.map((r) => [r.name, r.occupation, r.role, r.status]).sort(),
      [
        ['Kavya Applicant', 'Engineer', 'ambassador', 'pending'],
        ['Priya Applicant', 'Engineer', 'member', 'pending'],
      ],
    );
    // Codes are never exposed, only who used them.
    assert.ok(!JSON.stringify(res.body).includes(member.code));

    const root = await app.get<AdminMemberDto>(`/admin/members/${admin.id}`, token);
    assert.equal(root.body.referredBy, null);
    assert.equal(root.body.referrals.counts.total, 3);

    const paged = await app.get<ReferralsDto>(
      `/admin/members/${admin.id}/referrals?limit=2`,
      token,
    );
    assert.equal(paged.body.referrals.length, 2);
    assert.notEqual(paged.body.nextCursor, null);

    for (const id of [crypto.randomUUID(), 'not-a-uuid']) {
      assert.equal((await app.get(`/admin/members/${id}`, token)).status, 404);
    }
  });

  it('approves a pending member or ambassador once, and logs each approval', async () => {
    const token = await as(admin);
    const approved = await app.post<AdminMemberDto>(
      `/admin/members/${applicant.id}/approve`,
      { reason: '  Known to   the Jodhpur chapter ' },
      token,
    );
    assert.equal(approved.status, 200);
    assert.equal(approved.body.member.status, 'approved');
    assert.notEqual(approved.body.member.reviewedAt, null);

    const again = await app.post(`/admin/members/${applicant.id}/approve`, {}, token);
    assert.equal(again.status, 409);
    assert.equal(again.body.error.code, 'CONFLICT');

    // No body at all is fine: the reason is optional.
    const res = await app.post(`/admin/members/${applyingAmbassador.id}/approve`, undefined, token);
    assert.equal(res.status, 200);

    const entries = await logEntries();
    assert.deepEqual(
      entries.map((e) => [e.action, e.target.type, e.target.id, e.target.label, e.reason]),
      [
        ['ambassador_approved', 'user', applyingAmbassador.id, 'Kavya Applicant', null],
        [
          'member_approved',
          'user',
          applicant.id,
          'Priya Applicant',
          'Known to the Jodhpur chapter',
        ],
      ],
    );
    assert.ok(entries.every((e) => e.admin.id === admin.id && e.admin.name === 'Root Admin'));

    // The approved member's own requests see the new status at once.
    const me = await app.get<{ user: { status: string } }>('/me', await as(applicant));
    assert.equal(me.body.user.status, 'approved');
  });

  it('refuses approvals that do not apply, and invalid input', async () => {
    const token = await as(admin);
    const pendingAdmin = await insertUser(t.db, { role: 'admin', status: 'pending' });
    const rejected = await insertUser(t.db, { status: 'rejected' });
    for (const user of [member, pendingAdmin, rejected]) {
      assert.equal((await app.post(`/admin/members/${user.id}/approve`, {}, token)).status, 409);
    }
    for (const id of [crypto.randomUUID(), 'not-a-uuid']) {
      assert.equal((await app.post(`/admin/members/${id}/approve`, {}, token)).status, 404);
    }
    const tooLong = { reason: 'x'.repeat(501) };
    assert.equal(
      (await app.post(`/admin/members/${applicant.id}/approve`, tooLong, token)).status,
      400,
    );
    const unknownField = { reason: 'ok', role: 'admin' };
    assert.equal(
      (await app.post(`/admin/members/${applicant.id}/approve`, unknownField, token)).status,
      400,
    );
    assert.deepEqual(await logEntries(), []);
  });

  /* --------------------------------------------------------- Query Blogs */

  it('starts a Query Blog and logs it; a duplicate is 409 and logs nothing', async () => {
    const token = await as(admin);
    const body = { categoryId: tech, title: 'Tech questions', description: 'Ask about tech.' };
    const created = await app.post<{ queryBlog: QueryBlogDto }>('/admin/query-blogs', body, token);
    assert.equal(created.status, 201);

    const duplicate = await app.post('/admin/query-blogs', { ...body, title: 'Again' }, token);
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.code, 'CONFLICT');

    // The original route is logged the same way.
    const viaOldRoute = await app.post<{ queryBlog: QueryBlogDto }>(
      '/query-blogs',
      { categoryId: finance, title: 'Money matters', description: 'Ask about money.' },
      token,
    );
    assert.equal(viaOldRoute.status, 201);

    assert.deepEqual(
      (await logEntries()).map((e) => [e.action, e.target.id, e.target.label]),
      [
        ['query_blog_created', viaOldRoute.body.queryBlog.id, 'Money matters'],
        ['query_blog_created', created.body.queryBlog.id, 'Tech questions'],
      ],
    );
  });

  it('removes a Query Blog with its queries, logs the reason, and frees the category', async () => {
    const token = await as(admin);
    const body = { categoryId: tech, title: 'Tech questions', description: 'Ask about tech.' };
    const { queryBlog } = (
      await app.post<{ queryBlog: QueryBlogDto }>('/admin/query-blogs', body, token)
    ).body;
    await insertComment(t.db, { blogId: queryBlog.id, authorId: member.id });

    const tooLong = await app.del(`/admin/query-blogs/${queryBlog.id}`, token, {
      reason: 'x'.repeat(501),
    });
    assert.equal(tooLong.status, 400);

    const removed = await app.del(`/admin/query-blogs/${queryBlog.id}`, token, {
      reason: 'Merged into Finance',
    });
    assert.equal(removed.status, 204);
    assert.equal((await app.get(`/query-blogs/${queryBlog.id}`)).status, 404);
    assert.equal((await app.get(`/blogs/${queryBlog.id}/comments`)).status, 404);
    assert.equal((await app.del(`/admin/query-blogs/${queryBlog.id}`, token)).status, 404);

    // Soft delete, like every blog removal: the rows stay, marked with who and when.
    const row = await t.db
      .selectFrom('blogs')
      .select(['deleted_at', 'deleted_by'])
      .where('blog_id', '=', queryBlog.id)
      .executeTakeFirstOrThrow();
    assert.notEqual(row.deleted_at, null);
    assert.equal(row.deleted_by, admin.id);

    const [entry] = await logEntries();
    assert.deepEqual(
      [entry?.action, entry?.target.id, entry?.target.label, entry?.reason],
      ['query_blog_deleted', queryBlog.id, 'Tech questions', 'Merged into Finance'],
    );
    assert.equal((await app.post('/admin/query-blogs', body, token)).status, 201);
  });

  it('only removes Query Blogs through the admin endpoint', async () => {
    const token = await as(admin);
    const discussion = await app.post<{ blog: { id: string } }>(
      '/blogs',
      {
        title: 'A discussion blog',
        content: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x'.repeat(100) }] }],
        },
        categoryIds: [tech],
      },
      token,
    );
    assert.equal(
      (await app.del(`/admin/query-blogs/${discussion.body.blog.id}`, token)).status,
      404,
    );
    assert.equal((await app.del('/admin/query-blogs/not-a-uuid', token)).status, 404);
  });

  /* -------------------------------------------------------- activity log */

  it('lists the log newest first, filtered by action and admin, page by page', async () => {
    const approve = async (user: TestUser, by: TestUser) => {
      const res = await app.post(`/admin/members/${user.id}/approve`, {}, await as(by));
      assert.equal(res.status, 200);
    };
    await approve(applicant, admin);
    await approve(applyingAmbassador, secondAdmin);
    const body = { categoryId: tech, title: 'Tech questions', description: 'Ask about tech.' };
    await app.post('/admin/query-blogs', body, await as(secondAdmin));

    const token = await as(admin);
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const query: string = cursor === null ? '' : `&cursor=${cursor}`;
      const res: TestResponse<LogPage> = await app.get(`/admin/action-logs?limit=1${query}`, token);
      seen.push(...res.body.entries.map((e) => e.action));
      cursor = res.body.nextCursor;
    } while (cursor !== null);
    assert.deepEqual(seen, ['query_blog_created', 'ambassador_approved', 'member_approved']);

    const actions = async (query: string) =>
      (await app.get<LogPage>(`/admin/action-logs?${query}`, token)).body.entries.map(
        (e) => e.action,
      );
    assert.deepEqual(await actions('action=member_approved'), ['member_approved']);
    assert.deepEqual(await actions(`adminId=${secondAdmin.id}`), [
      'query_blog_created',
      'ambassador_approved',
    ]);
    assert.deepEqual(await actions(`adminId=${secondAdmin.id}&action=member_approved`), []);

    for (const bad of ['action=member_rejected', 'adminId=nope', 'cursor=bm9wZQ']) {
      assert.equal((await app.get(`/admin/action-logs?${bad}`, token)).status, 400, bad);
    }
  });

  it('has no way to change or remove log entries over the API', async () => {
    await app.post(`/admin/members/${applicant.id}/approve`, {}, await as(admin));
    const [entry] = await logEntries();
    assert.ok(entry);
    const token = await as(admin);
    assert.equal((await app.del(`/admin/action-logs/${entry.id}`, token)).status, 404);
    assert.equal((await app.post(`/admin/action-logs/${entry.id}`, {}, token)).status, 404);
    assert.equal((await logEntries()).length, 1);
  });
});
