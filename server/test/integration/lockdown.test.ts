import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import {
  createTestDatabase,
  pgError,
  skipWithoutDatabase,
  type TestDatabase,
} from '../support/database.ts';

/**
 * The backstop: even with a leaked Supabase key, the Data API roles can read
 * and write nothing. Fails if a future migration forgets RLS on a new table.
 */
describe('RLS and privilege lockdown', { skip: skipWithoutDatabase }, () => {
  let t: TestDatabase;

  before(async () => {
    t = await createTestDatabase();
  });
  after(async () => {
    await t.drop();
  });

  it('enables RLS on every public table, with no policies', async () => {
    const { rows } = await t.pool.query<{ relname: string; relrowsecurity: boolean }>(`
      select c.relname, c.relrowsecurity
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
    `);
    assert.ok(rows.length >= 8);
    assert.deepEqual(
      rows.filter((r) => !r.relrowsecurity).map((r) => r.relname),
      [],
    );

    const policies = await t.pool.query(`select 1 from pg_policies where schemaname = 'public'`);
    assert.equal(policies.rowCount, 0);
  });

  it('grants anon and authenticated nothing on tables or functions', async () => {
    const { rows } = await t.pool.query<{ object: string }>(`
      select c.relname as object
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      cross join (values ('anon'), ('authenticated')) as r(role)
      where n.nspname = 'public' and c.relkind in ('r', 'S')
        and has_table_privilege(r.role, c.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
      union all
      select p.proname
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      cross join (values ('anon'), ('authenticated')) as r(role)
      where n.nspname = 'public' and has_function_privilege(r.role, p.oid, 'EXECUTE')
    `);
    assert.deepEqual(rows, []);
  });

  it('refuses a query made as the anon role', async () => {
    const client = await t.pool.connect();
    try {
      await client.query('set role anon');
      const error = await pgError(client.query('select * from public.users'));
      assert.equal(error.code, '42501'); // insufficient_privilege
    } finally {
      await client.query('reset role');
      client.release();
    }
  });
});
