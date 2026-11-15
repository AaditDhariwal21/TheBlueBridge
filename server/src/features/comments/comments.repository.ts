import { sql } from 'kysely';

import type { Db } from '../../db/schema.ts';
import { keysetBefore, type Cursor } from '../../lib/cursor.ts';

/** One entry of a thread. Removed entries carry no text or author (see selectThread). */
export interface ThreadRow {
  comment_id: string;
  blog_id: string;
  parent_comment_id: string | null;
  body: string | null;
  removed: boolean;
  created_at: Date;
  author_id: string | null;
  author_name: string | null;
  author_occupation: string | null;
  author_avatar_url: string | null;
}

/**
 * A blog's thread in posting order: its live comments (comments_thread_idx), plus each
 * removed comment that still has a live reply somewhere beneath it, as a placeholder that
 * keeps the replies in place. Removed comments without live replies are left out, and a
 * placeholder never carries its text or author: they are blanked here, in SQL.
 * The placeholders are found by walking up from the live replies, by primary key.
 */
export async function selectThread(db: Db, blogId: string): Promise<ThreadRow[]> {
  const { rows } = await sql<ThreadRow>`
    with recursive holders as (
      select p.comment_id, p.parent_comment_id
      from public.comments c
      join public.comments p on p.comment_id = c.parent_comment_id
      where c.blog_id = ${blogId} and c.deleted_at is null and p.deleted_at is not null
      union
      select p.comment_id, p.parent_comment_id
      from holders h
      join public.comments p on p.comment_id = h.parent_comment_id
      where p.deleted_at is not null
    ),
    thread as (
      select c.comment_id, c.blog_id, c.parent_comment_id, c.user_id, c.body, c.created_at,
             false as removed
      from public.comments c
      where c.blog_id = ${blogId} and c.deleted_at is null
      union all
      select c.comment_id, c.blog_id, c.parent_comment_id, null, null, c.created_at, true
      from public.comments c
      where c.comment_id in (select comment_id from holders)
    )
    select t.comment_id, t.blog_id, t.parent_comment_id, t.body, t.removed, t.created_at,
           author.user_id as author_id,
           author.name as author_name,
           author.occupation as author_occupation,
           author.avatar_url as author_avatar_url
    from thread t
    left join public.users author on author.user_id = t.user_id
    order by t.created_at, t.comment_id
  `.execute(db);
  return rows;
}

/** One live comment, shaped like a thread entry (e.g. the one just posted). */
export function selectComment(db: Db, commentId: string): Promise<ThreadRow | undefined> {
  return db
    .selectFrom('comments as c')
    .innerJoin('users as author', 'author.user_id', 'c.user_id')
    .select([
      'c.comment_id',
      'c.blog_id',
      'c.parent_comment_id',
      'c.body',
      sql<boolean>`false`.as('removed'),
      'c.created_at',
      'author.user_id as author_id',
      'author.name as author_name',
      'author.occupation as author_occupation',
      'author.avatar_url as author_avatar_url',
    ])
    .where('c.comment_id', '=', commentId)
    .where('c.deleted_at', 'is', null)
    .executeTakeFirst();
}

/**
 * The comment being replied to, if it is in this blog and not removed, plus
 * the author of the top-level comment it hangs from (on a Query Blog, the
 * query's author decides who may reply). `rootAuthorId` is null when that top-level
 * comment was itself removed.
 */
export async function findReplyTarget(
  db: Db,
  blogId: string,
  parentId: string,
): Promise<{ rootAuthorId: string | null } | undefined> {
  const { rows } = await sql<{ parent_live: boolean | null; root_author_id: string | null }>`
    with recursive chain as (
      select comment_id, parent_comment_id, user_id, deleted_at, 0 as depth
      from public.comments
      where comment_id = ${parentId} and blog_id = ${blogId}
      union all
      select c.comment_id, c.parent_comment_id, c.user_id, c.deleted_at, chain.depth + 1
      from public.comments c
      join chain on c.comment_id = chain.parent_comment_id
      where chain.depth < 10000
    )
    select (select deleted_at is null from chain where depth = 0) as parent_live,
           (select user_id from chain where parent_comment_id is null and deleted_at is null)
             as root_author_id
  `.execute(db);
  const row = rows[0];
  if (row?.parent_live !== true) return undefined;
  return { rootAuthorId: row.root_author_id };
}

export async function insertComment(
  db: Db,
  values: { blogId: string; userId: string; parentId: string | null; body: string },
): Promise<string> {
  const { comment_id } = await db
    .insertInto('comments')
    .values({
      blog_id: values.blogId,
      user_id: values.userId,
      parent_comment_id: values.parentId,
      body: values.body,
    })
    .returning('comment_id')
    .executeTakeFirstOrThrow();
  return comment_id;
}

/**
 * Soft delete. Replies stay visible under a "removed" placeholder; the purge
 * (purge_soft_deleted, 0011) removes the row for good 30 days later.
 */
export async function softDeleteComment(
  db: Db,
  blogId: string,
  commentId: string,
  deletedBy: string,
): Promise<boolean> {
  const result = await db
    .updateTable('comments')
    .set({ deleted_at: sql<Date>`now()`, deleted_by: deletedBy })
    .where('comment_id', '=', commentId)
    .where('blog_id', '=', blogId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();
  return result.numUpdatedRows > 0n;
}

/**
 * One author's live comments on live blogs, newest first (comments_author_idx),
 * with the blog each belongs to. Fetches limit + 1.
 */
export function selectAuthorComments(
  db: Db,
  authorId: string,
  page: { limit: number; cursor?: Cursor | undefined },
) {
  const base = db
    .selectFrom('comments as c')
    .innerJoin('blogs as b', 'b.blog_id', 'c.blog_id')
    .where('c.user_id', '=', authorId)
    .where('c.deleted_at', 'is', null)
    .where('b.deleted_at', 'is', null);
  const query =
    page.cursor === undefined
      ? base
      : base.where(keysetBefore('c.created_at', 'c.comment_id', page.cursor));
  return query
    .select([
      'c.comment_id',
      'c.parent_comment_id',
      // Live comments always have a body (comments_scrubbed_check).
      sql<string>`c.body`.as('body'),
      'c.created_at',
      sql<string>`c.created_at::text`.as('created_at_key'),
      'b.blog_id',
      'b.title as blog_title',
      'b.type as blog_type',
    ])
    .orderBy('c.created_at', 'desc')
    .orderBy('c.comment_id', 'desc')
    .limit(page.limit + 1)
    .execute();
}
