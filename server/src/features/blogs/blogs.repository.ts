import { sql, type ExpressionBuilder } from 'kysely';
import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/postgres';

import type { BlogType, Database, Db } from '../../db/schema.ts';
import { keysetBefore, type Cursor } from '../../lib/cursor.ts';
import type { RichDoc } from '../../lib/richText.ts';
import type { SearchCursor } from './blogs.schemas.ts';

/** Characters of body shown on a feed card. */
const EXCERPT_LENGTH = 280;
/** Passed as a parameter so no escaping is involved. */
const WORD = '\\S+';

type BlogRow = ExpressionBuilder<
  Database & { b: Database['blogs']; author: Database['users'] },
  'b' | 'author'
>;

/** Fields every blog list and detail shows: author, categories, counts. */
function blogCard(eb: BlogRow) {
  return [
    'b.blog_id',
    'b.title',
    'b.created_at',
    'b.updated_at',
    sql<string>`b.created_at::text`.as('created_at_key'),
    sql<string>`case when char_length(b.body) > ${EXCERPT_LENGTH}
      then left(b.body, ${EXCERPT_LENGTH}) || '…' else b.body end`.as('excerpt'),
    sql<number>`regexp_count(b.body, ${WORD})`.as('word_count'),
    'author.user_id as author_id',
    'author.name as author_name',
    'author.occupation as author_occupation',
    'author.avatar_url as author_avatar_url',
    jsonArrayFrom(
      eb
        .selectFrom('blogs_categories as bc')
        .innerJoin('categories as c', 'c.cat_id', 'bc.cat_id')
        .select(['c.cat_id as id', 'c.cat_name as name', 'c.color'])
        .whereRef('bc.blog_id', '=', 'b.blog_id')
        .orderBy('c.cat_name'),
    ).as('categories'),
    // Served by comments_thread_idx (blog_id, …).
    eb
      .selectFrom('comments as c')
      .select(sql<number>`count(*)::int`.as('n'))
      .whereRef('c.blog_id', '=', 'b.blog_id')
      .where('c.deleted_at', 'is', null)
      .as('comment_count'),
  ] as const;
}

function liveBlogs(db: Db, type: BlogType) {
  return db
    .selectFrom('blogs as b')
    .innerJoin('users as author', 'author.user_id', 'b.user_id')
    .where('b.type', '=', type)
    .where('b.deleted_at', 'is', null);
}

/**
 * Live discussion blogs, optionally only those tagged with any of `categoryIds`. EXISTS
 * (not a join) so a blog in two of the chosen categories still appears once; it is served
 * by the blogs_categories primary key (blog_id, cat_id).
 */
function feedBlogs(db: Db, categoryIds: readonly string[]) {
  const live = liveBlogs(db, 'discussion');
  if (categoryIds.length === 0) return live;
  return live.where((eb) =>
    eb.exists(
      eb
        .selectFrom('blogs_categories as fc')
        .select('fc.blog_id')
        .whereRef('fc.blog_id', '=', 'b.blog_id')
        .where('fc.cat_id', 'in', categoryIds),
    ),
  );
}

/** The Feed, newest first (blogs_feed_idx). Fetches limit + 1. */
export function selectFeed(
  db: Db,
  categoryIds: readonly string[],
  page: { limit: number; cursor: Cursor | null },
) {
  const base = feedBlogs(db, categoryIds);
  const query =
    page.cursor === null
      ? base
      : base.where(keysetBefore('b.created_at', 'b.blog_id', page.cursor));
  return query
    .select((eb) => blogCard(eb))
    .orderBy('b.created_at', 'desc')
    .orderBy('b.blog_id', 'desc')
    .limit(page.limit + 1)
    .execute();
}

/**
 * Feed search (blogs_search_idx): blogs matching `tsquery`, most relevant first, newest
 * first among equals. Relevance is ts_rank rounded to a fixed-scale numeric, so the exact
 * value can travel in the cursor and the keyset comparison is stable. Fetches limit + 1.
 */
export function selectFeedSearch(
  db: Db,
  tsquery: string,
  categoryIds: readonly string[],
  page: { limit: number; cursor: SearchCursor | null },
) {
  const query = sql`to_tsquery('simple', ${tsquery})`;
  const rank = sql<string>`round(ts_rank(b.search_vector, ${query})::numeric, 6)`;
  const matching = feedBlogs(db, categoryIds).where(sql<boolean>`b.search_vector @@ ${query}`);
  const { cursor } = page;
  const paged =
    cursor === null
      ? matching
      : matching.where(
          sql<boolean>`(${rank}, b.created_at, b.blog_id) < (${cursor.r}::numeric, ${cursor.t}::timestamptz, ${cursor.id}::uuid)`,
        );
  return paged
    .select((eb) => [...blogCard(eb), rank.as('rank_key')])
    .orderBy(rank, 'desc')
    .orderBy('b.created_at', 'desc')
    .orderBy('b.blog_id', 'desc')
    .limit(page.limit + 1)
    .execute();
}

export function selectDiscussionBlog(db: Db, blogId: string) {
  return liveBlogs(db, 'discussion')
    .select((eb) => [...blogCard(eb), 'b.body', 'b.content'])
    .where('b.blog_id', '=', blogId)
    .executeTakeFirst();
}

/** One author's live blogs of both types, newest first (blogs_author_idx). Fetches limit + 1. */
export function selectAuthorBlogs(
  db: Db,
  authorId: string,
  page: { limit: number; cursor?: Cursor | undefined },
) {
  const base = db
    .selectFrom('blogs as b')
    .innerJoin('users as author', 'author.user_id', 'b.user_id')
    .where('b.user_id', '=', authorId)
    .where('b.deleted_at', 'is', null);
  const query =
    page.cursor === undefined
      ? base
      : base.where(keysetBefore('b.created_at', 'b.blog_id', page.cursor));
  return query
    .select((eb) => [...blogCard(eb), 'b.type'])
    .orderBy('b.created_at', 'desc')
    .orderBy('b.blog_id', 'desc')
    .limit(page.limit + 1)
    .execute();
}

/** Query Blogs, newest first (blogs_query_panel_idx). At most one per category. */
export function selectQueryBlogs(db: Db, blogId?: string) {
  const base = liveBlogs(db, 'query');
  return (blogId === undefined ? base : base.where('b.blog_id', '=', blogId))
    .select((eb) => [
      'b.blog_id',
      'b.title',
      'b.body as description',
      'b.created_at',
      'author.user_id as author_id',
      'author.name as author_name',
      'author.occupation as author_occupation',
      'author.avatar_url as author_avatar_url',
      jsonObjectFrom(
        eb
          .selectFrom('blogs_categories as bc')
          .innerJoin('categories as c', 'c.cat_id', 'bc.cat_id')
          .select(['c.cat_id as id', 'c.cat_name as name', 'c.color'])
          .whereRef('bc.blog_id', '=', 'b.blog_id'),
      ).as('category'),
      // Served by comments_top_level_idx.
      eb
        .selectFrom('comments as c')
        .select(sql<number>`count(*)::int`.as('n'))
        .whereRef('c.blog_id', '=', 'b.blog_id')
        .where('c.parent_comment_id', 'is', null)
        .where('c.deleted_at', 'is', null)
        .as('query_count'),
      sql<Date>`greatest(b.created_at, (
        select max(c.created_at) from public.comments c
        where c.blog_id = b.blog_id and c.deleted_at is null
      ))`.as('last_activity_at'),
    ])
    .orderBy('b.created_at', 'desc')
    .orderBy('b.blog_id', 'desc')
    .execute();
}

/** What writes and moderation need to know about a live blog of either type. */
export function selectBlogForWrite(db: Db, blogId: string) {
  return db
    .selectFrom('blogs as b')
    .select([
      'b.blog_id',
      'b.type',
      'b.title',
      'b.user_id',
      sql<string[]>`array(
        select bc.cat_id::text from public.blogs_categories bc where bc.blog_id = b.blog_id
      )`.as('category_ids'),
    ])
    .where('b.blog_id', '=', blogId)
    .where('b.deleted_at', 'is', null)
    .executeTakeFirst();
}

export async function insertBlog(
  db: Db,
  values: {
    userId: string;
    type: BlogType;
    title: string;
    body: string;
    content: RichDoc | null;
    categoryIds: readonly string[];
  },
): Promise<string> {
  const { blog_id } = await db
    .insertInto('blogs')
    .values({
      user_id: values.userId,
      type: values.type,
      title: values.title,
      body: values.body,
      content: values.content && JSON.stringify(values.content),
    })
    .returning('blog_id')
    .executeTakeFirstOrThrow();
  await db
    .insertInto('blogs_categories')
    .values(values.categoryIds.map((cat_id) => ({ blog_id, cat_id })))
    .execute();
  return blog_id;
}

/**
 * Soft delete, the one deletion mechanism for blogs of both types. Comments and category
 * links stay (so the history is auditable) and become unreachable with the blog.
 */
export async function softDeleteBlog(db: Db, blogId: string, deletedBy: string): Promise<boolean> {
  const result = await db
    .updateTable('blogs')
    .set({ deleted_at: sql<Date>`now()`, deleted_by: deletedBy })
    .where('blog_id', '=', blogId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();
  return result.numUpdatedRows > 0n;
}
