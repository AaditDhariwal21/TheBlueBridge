import { randomBytes } from 'node:crypto';

import { sql } from 'kysely';

import type { BlogType, Db, UserRole, UserStatus } from '../../src/db/schema.ts';
import { generateReferralCode } from '../../src/lib/referralCode.ts';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  code: string;
  referralCodeId: string;
}

/** Category id by seeded name ('Health', 'Finance', 'Tech', 'Entrepreneurship', 'Legal'). */
export async function categoryId(db: Db, name: string): Promise<string> {
  const row = await db
    .selectFrom('categories')
    .select('cat_id')
    .where('cat_name', '=', name)
    .executeTakeFirstOrThrow();
  return row.cat_id;
}

export function uniqueEmail(): string {
  return `user-${randomBytes(4).toString('hex')}@example.com`;
}

/** An Auth user, a profile (approved unless told otherwise), categories and an own referral code. */
export async function insertUser(
  db: Db,
  options: {
    role?: UserRole;
    status?: UserStatus;
    categories?: string[];
    referredBy?: TestUser;
    name?: string;
  } = {},
): Promise<TestUser> {
  const email = uniqueEmail();
  const name = options.name ?? `Test ${options.role ?? 'member'}`;
  return db.transaction().execute(async (trx) => {
    const { rows } = await sql<{
      id: string;
    }>`insert into auth.users (email) values (${email}) returning id`.execute(trx);
    const id = rows[0]?.id;
    if (id === undefined) throw new Error('auth user not created');

    await trx
      .insertInto('users')
      .values({
        user_id: id,
        name,
        phone_number: '+919876543210',
        occupation: 'Engineer',
        role: options.role ?? 'member',
        status: options.status ?? 'approved',
        referral_code_id: options.referredBy?.referralCodeId ?? null,
      })
      .execute();

    for (const category of options.categories ?? []) {
      await trx
        .insertInto('user_categories')
        .values({ user_id: id, cat_id: await categoryId(trx, category) })
        .execute();
    }

    const code = generateReferralCode();
    const { referral_code_id } = await trx
      .insertInto('referral_codes')
      .values({ user_id: id, code })
      .returning('referral_code_id')
      .executeTakeFirstOrThrow();

    return { id, email, name, code, referralCodeId: referral_code_id };
  });
}

/** A blog and its category links, written in one transaction (as the API will). */
export async function insertBlog(
  db: Db,
  options: { authorId: string; type?: BlogType; categoryIds: string[] },
): Promise<string> {
  return db.transaction().execute(async (trx) => {
    const { blog_id } = await trx
      .insertInto('blogs')
      .values({
        user_id: options.authorId,
        type: options.type ?? 'discussion',
        title: 'A title',
        body: 'A body',
      })
      .returning('blog_id')
      .executeTakeFirstOrThrow();
    for (const cat_id of options.categoryIds) {
      await trx.insertInto('blogs_categories').values({ blog_id, cat_id }).execute();
    }
    return blog_id;
  });
}

export async function insertComment(
  db: Db,
  options: { blogId: string; authorId: string; parentId?: string },
): Promise<string> {
  const { comment_id } = await db
    .insertInto('comments')
    .values({
      blog_id: options.blogId,
      user_id: options.authorId,
      parent_comment_id: options.parentId ?? null,
      body: 'A comment',
    })
    .returning('comment_id')
    .executeTakeFirstOrThrow();
  return comment_id;
}
