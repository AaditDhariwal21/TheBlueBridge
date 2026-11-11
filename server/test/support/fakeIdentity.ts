import { sql } from 'kysely';

import type { Db } from '../../src/db/schema.ts';
import type { IdentityProvider } from '../../src/lib/identity.ts';

/**
 * Stands in for Supabase Auth: writes to the shim's auth.users table, so the
 * profile foreign key behaves as it does in production. Records every call.
 */
export function createFakeIdentity(db: Db) {
  const calls = { created: [] as string[], deleted: [] as string[] };

  const identity: IdentityProvider = {
    async createUser({ email }) {
      const { rows } = await sql<{ id: string }>`
        insert into auth.users (email) values (${email})
        on conflict (email) do nothing
        returning id
      `.execute(db);
      const id = rows[0]?.id;
      if (id === undefined) return { ok: false, reason: 'email_taken' };
      calls.created.push(id);
      return { ok: true, userId: id };
    },

    async deleteUser(userId) {
      calls.deleted.push(userId);
      await sql`delete from auth.users where id = ${userId}`.execute(db);
    },
  };

  return { identity, calls };
}
