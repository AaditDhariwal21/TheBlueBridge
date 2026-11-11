import { sql } from 'kysely';

import type { Db } from '../../db/schema.ts';
import { keysetBefore, type Cursor } from '../../lib/cursor.ts';

function commentRows(db: Db) {
  return db
    .selectFrom('comments as c')
    .innerJoin('users as author', 'author.user_id', 'c.user_id')
    .select([
      'c.comment_id',
      'c.blog_id',
      'c.parent_comment_id',
      // A removed comment keeps its place in the thread, but never its text.
      sql<string | null>`case when c.deleted_at is null then c.body end`.as('body'),
      sql<boolean>`c.deleted_at is not null`.as('removed'),
      'c.created_at',
      'author.user_id as author_id',
      'author.name as author_name',
      'author.occupation as author_occupation',
      'author.avatar_url as author_avatar_url',
    ]);
}

/** A blog's whole thread in posting order (comments_thread_idx). */
export function selectThread(db: Db, blogId: string) {
  return commentRows(db)
    .where('c.blog_id', '=', blogId)
    .orderBy('c.created_at')
    .orderBy('c.comment_id')
    .execute();
}

export function selectComment(db: Db, commentId: string) {
  return commentRows(db).where('c.comment_id', '=', commentId).executeTakeFirst();
}

/**
 * The comment being replied to, if it is in this blog and not removed, plus
 * the author of the top-level comment it hangs from (on a Query Blog, the
 * query's author decides who may reply).
 */
export async function findReplyTarget(
  db: Db,
  blogId: string,
  parentId: string,
): Promise<{ rootAuthorId: string } | undefined> {
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
           (select user_id from chain where parent_comment_id is null) as root_author_id
  `.execute(db);
  const row = rows[0];
  if (row?.parent_live !== true || row.root_author_id === null) return undefined;
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

/** Soft delete. Replies stay visible under a "removed" placeholder. */
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
      'c.body',
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
