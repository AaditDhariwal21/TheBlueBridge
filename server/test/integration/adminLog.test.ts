import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

import { sql } from 'kysely';

import type { Db } from '../../src/db/schema.ts';
import { logAdminAction } from '../../src/features/adminLog/adminLog.service.ts';
import { deleteQueryBlog } from '../../src/features/blogs/blogs.service.ts';
import { approveMember } from '../../src/features/members/members.service.ts';
import type { Viewer } from '../../src/middleware/authenticate.ts';
import {
  createTestDatabase,
  isWaitingOnLock,
  pgError,
  skipWithoutDatabase,
  waitUntil,
  type TestDatabase,
} from '../support/database.ts';
import { categoryId, insertBlog, insertUser, type TestUser } from '../support/fixtures.ts';

/** The admin action log's guarantees, checked against the database itself. */
describe('admin action log', { skip: skipWithoutDatabase }, () => {
  let t: TestDatabase;
  let admin: TestUser;
  let viewer: Viewer;

  before(async () => {
    t = await createTestDatabase();
  });
  after(async () => {
    await t.drop();
  });
  beforeEach(async () => {
    await t.reset();
    admin = await insertUser(t.db, { role: 'admin', name: 'Root Admin' });
    viewer = { id: admin.id, role: 'admin', status: 'approved', email: admin.email };
  });

  const entryCount = async () =>
    (
      await t.db
        .selectFrom('admin_action_logs')
        .select(sql<number>`count(*)::int`.as('n'))
        .executeTakeFirstOrThrow()
    ).n;

  async function writeEntry(): Promise<string> {
    const applicant = await insertUser(t.db, { status: 'pending', name: 'Priya' });
    await approveMember(t.db, viewer, applicant.id, 'Checked');
    const row = await t.db
      .selectFrom('admin_action_logs')
      .select('log_id')
      .executeTakeFirstOrThrow();
    return row.log_id;
  }

  describe('append-only', () => {
    it('refuses UPDATE, DELETE and TRUNCATE, even from a superuser', async () => {
      const id = await writeEntry();
      for (const statement of [
        sql`update public.admin_action_logs set reason = 'edited' where log_id = ${id}`,
        sql`delete from public.admin_action_logs where log_id = ${id}`,
        sql`truncate public.admin_action_logs`,
      ]) {
        const error = await pgError(statement.execute(t.db));
        assert.equal(error.constraint, 'admin_action_logs_append_only');
        assert.equal(error.code, '42501'); // insufficient_privilege
      }
      assert.equal(await entryCount(), 1);
    });

    it('grants nobody UPDATE, DELETE or TRUNCATE, not even its owner', async () => {
      const { rows } = await t.pool.query<{ grantee: string; privilege_type: string }>(`
        select coalesce(r.rolname, 'PUBLIC') as grantee, acl.privilege_type
        from pg_class c
        cross join lateral aclexplode(c.relacl) acl
        left join pg_roles r on r.oid = acl.grantee
        where c.oid = 'public.admin_action_logs'::regclass
      `);
      assert.ok(rows.length > 0, 'the table has explicit privileges');
      assert.deepEqual(
        rows.filter((r) => ['UPDATE', 'DELETE', 'TRUNCATE'].includes(r.privilege_type)),
        [],
      );
      // The owner (the API's role) keeps what it needs: adding and reading entries.
      const owner = rows.filter((r) => r.grantee === 'postgres').map((r) => r.privilege_type);
      assert.ok(owner.includes('INSERT') && owner.includes('SELECT'));
    });

    it('accepts only the known actions, matching targets and short reasons', async () => {
      const insert = (values: Record<string, unknown>) =>
        sql`insert into public.admin_action_logs (admin_id, action, target_type, target_id, target_label, reason)
            values (${admin.id}, ${values.action}, ${values.targetType}, ${crypto.randomUUID()}, ${values.label}, ${values.reason})`.execute(
          t.db,
        );
      const valid = { action: 'member_approved', targetType: 'user', label: 'Priya', reason: null };
      const cases: [Record<string, unknown>, string][] = [
        [{ ...valid, action: 'member_rejected' }, 'admin_action_logs_action_check'],
        [{ ...valid, targetType: 'blog' }, 'admin_action_logs_target_type_check'],
        [{ ...valid, label: '' }, 'admin_action_logs_target_label_check'],
        [{ ...valid, reason: 'x'.repeat(501) }, 'admin_action_logs_reason_check'],
        [{ ...valid, reason: ' padded ' }, 'admin_action_logs_reason_check'],
      ];
      for (const [values, constraint] of cases) {
        assert.equal((await pgError(insert(values))).constraint, constraint);
      }
      await insert(valid);
    });

    it('keeps an entry readable after its target is removed: no foreign key on the target', async () => {
      const author = await insertUser(t.db);
      const blogId = await insertBlog(t.db, {
        authorId: author.id,
        type: 'query',
        categoryIds: [await categoryId(t.db, 'Tech')],
        title: 'Tech questions',
      });
      await deleteQueryBlog(t.db, viewer, blogId, null);
      // Even a hard delete of the target leaves the entry and its label.
      await t.db.deleteFrom('blogs').where('blog_id', '=', blogId).execute();
      const entry = await t.db
        .selectFrom('admin_action_logs')
        .select(['target_id', 'target_label'])
        .executeTakeFirstOrThrow();
      assert.deepEqual(entry, { target_id: blogId, target_label: 'Tech questions' });
    });
  });

  describe('written atomically with the action', () => {
    // A reason the API's validation would stop, passed straight to the services so the
    // log insert itself fails after the action's own write.
    const TOO_LONG = 'x'.repeat(501);

    it('rolls an approval back when its entry cannot be written', async () => {
      const applicant = await insertUser(t.db, { status: 'pending' });
      const error = await pgError(approveMember(t.db, viewer, applicant.id, TOO_LONG));
      assert.equal(error.constraint, 'admin_action_logs_reason_check');

      const row = await t.db
        .selectFrom('users')
        .select(['status', 'reviewed_by'])
        .where('user_id', '=', applicant.id)
        .executeTakeFirstOrThrow();
      assert.deepEqual(row, { status: 'pending', reviewed_by: null });
      assert.equal(await entryCount(), 0);
    });

    it('rolls a Query Blog removal back when its entry cannot be written', async () => {
      const author = await insertUser(t.db);
      const blogId = await insertBlog(t.db, {
        authorId: author.id,
        type: 'query',
        categoryIds: [await categoryId(t.db, 'Legal')],
      });
      const error = await pgError(deleteQueryBlog(t.db, viewer, blogId, TOO_LONG));
      assert.equal(error.constraint, 'admin_action_logs_reason_check');

      const row = await t.db
        .selectFrom('blogs')
        .select('deleted_at')
        .where('blog_id', '=', blogId)
        .executeTakeFirstOrThrow();
      assert.equal(row.deleted_at, null);
      assert.equal(await entryCount(), 0);
    });

    it('refuses to log outside a transaction', async () => {
      const entry = {
        adminId: admin.id,
        action: 'member_approved' as const,
        targetId: crypto.randomUUID(),
        targetLabel: 'Priya',
        reason: null,
      };
      await assert.rejects(logAdminAction(t.db, entry), /inside the transaction/);
      await t.db.transaction().execute((trx: Db) => logAdminAction(trx, entry));
      assert.equal(await entryCount(), 1);
    });
  });

  it('serialises concurrent approvals on the applicant row, so only one is logged', async () => {
    const applicant = await insertUser(t.db, { status: 'pending' });
    const other = await t.pool.connect();
    try {
      // Another admin's approval, in progress: it holds the applicant's row.
      await other.query('begin');
      await other.query(
        `update public.users set status = 'approved', reviewed_by = $2, reviewed_at = now()
         where user_id = $1`,
        [applicant.id, admin.id],
      );

      let settled = false;
      const racing = approveMember(t.db, viewer, applicant.id, null).finally(() => {
        settled = true;
      });
      racing.catch(() => null); // inspected below

      // Without the row lock the approval would read "pending" now, approve again and
      // write a second log entry.
      const waiting = async () => {
        const { rows } = await t.pool.query<{ pid: number }>(
          `select pid from pg_stat_activity where query like '%for no key update%' and pid <> pg_backend_pid()`,
        );
        return (await Promise.all(rows.map((r) => isWaitingOnLock(t.pool, r.pid)))).some(Boolean);
      };
      await waitUntil(async () => settled || (await waiting()));
      assert.equal(settled, false, 'the approval should wait for the other transaction');

      await other.query('commit');
      await assert.rejects(racing, { code: 'CONFLICT' });
      assert.equal(await entryCount(), 0);
    } finally {
      other.release();
    }
  });
});
