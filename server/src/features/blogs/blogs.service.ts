import { z } from 'zod';

import type { BlogType, Db } from '../../db/schema.ts';
import { encodeCursor, paginate, type Cursor } from '../../lib/cursor.ts';
import { AppError, validationError } from '../../lib/errors.ts';
import type { RichDoc } from '../../lib/richText.ts';
import type { Viewer } from '../../middleware/authenticate.ts';
import {
  canCreateQueryBlog,
  canDeleteQueryBlog,
  canModerate,
  canWriteBlog,
} from '../../policies/permissions.ts';
import { logAdminAction } from '../adminLog/adminLog.service.ts';
import { allCategoriesExist, type Category } from '../categories/categories.service.ts';
import { getScopedActor } from '../users/users.service.ts';
import {
  insertBlog,
  selectAuthorBlogs,
  selectBlogForWrite,
  selectDiscussionBlog,
  selectFeed,
  selectFeedSearch,
  selectQueryBlogs,
  softDeleteBlog,
} from './blogs.repository.ts';
import {
  searchCursor,
  type CreateBlogInput,
  type CreateQueryBlogInput,
  type FeedRequest,
} from './blogs.schemas.ts';

export interface AuthorDto {
  id: string;
  name: string;
  occupation: string;
  avatarUrl: string | null;
}

/** A discussion blog as the Feed shows it. */
export interface BlogDto {
  id: string;
  title: string;
  /** The start of the body; ends with "…" when shortened. */
  excerpt: string;
  categories: Category[];
  author: AuthorDto;
  createdAt: string;
  updatedAt: string;
  readTimeMinutes: number;
  /** Live comments and replies. */
  commentCount: number;
}

export interface BlogDetailDto extends BlogDto {
  /** Plain text. */
  body: string;
  /** The formatted document, or null for blogs without formatting (render `body`). */
  content: RichDoc | null;
}

/** An item in "My blogs": either kind of blog. */
export interface MyBlogDto extends BlogDto {
  type: BlogType;
}

export interface QueryBlogDto {
  id: string;
  title: string;
  description: string;
  category: Category;
  /** Who started it (an ambassador or admin). */
  author: AuthorDto;
  createdAt: string;
  /** Live top-level queries. */
  queryCount: number;
  lastActivityAt: string;
}

const WORDS_PER_MINUTE = 200;
const blogId = z.uuid();

/* -------------------------------------------------------------- discussion */

/**
 * The Feed: newest first, or most relevant first for a search, optionally narrowed to
 * blogs in any of the chosen categories. Query Blogs are never in it.
 */
export async function listFeed(
  db: Db,
  request: FeedRequest,
): Promise<{ blogs: BlogDto[]; nextCursor: string | null }> {
  const { limit, categoryIds } = request;
  if (request.order === 'latest') {
    const rows = await selectFeed(db, categoryIds, request);
    const { items, nextCursor } = paginate(rows, limit, (row) =>
      encodeCursor({ createdAt: row.created_at_key, id: row.blog_id }),
    );
    return { blogs: items.map(toBlogDto), nextCursor };
  }
  if (request.tsquery === null) return { blogs: [], nextCursor: null };
  const rows = await selectFeedSearch(db, request.tsquery, categoryIds, request);
  const { items, nextCursor } = paginate(rows, limit, (row) =>
    searchCursor.encode({ r: row.rank_key, t: row.created_at_key, id: row.blog_id }),
  );
  return { blogs: items.map(toBlogDto), nextCursor };
}

export async function getBlog(db: Db, id: string): Promise<BlogDetailDto> {
  const row = blogId.safeParse(id).success ? await selectDiscussionBlog(db, id) : undefined;
  if (!row) throw new AppError('NOT_FOUND', 'This blog doesn’t exist or was removed.');
  return { ...toBlogDto(row), body: row.body, content: row.content };
}

/**
 * One author's live blogs and Query Blogs, newest first: the viewer's own (GET /me/blogs) or
 * a member's, from their profile (GET /members/:id/blogs). An unknown author has none.
 */
export async function listAuthorBlogs(
  db: Db,
  authorId: string,
  page: { limit: number; cursor?: Cursor | undefined },
): Promise<{ blogs: MyBlogDto[]; nextCursor: string | null }> {
  if (!blogId.safeParse(authorId).success) throw new AppError('NOT_FOUND', 'Member not found.');
  const rows = await selectAuthorBlogs(db, authorId, page);
  const { items, nextCursor } = paginate(rows, page.limit, (row) =>
    encodeCursor({ createdAt: row.created_at_key, id: row.blog_id }),
  );
  return { blogs: items.map((row) => ({ ...toBlogDto(row), type: row.type })), nextCursor };
}

export async function createBlog(
  db: Db,
  viewer: Viewer,
  input: CreateBlogInput,
): Promise<BlogDetailDto> {
  if (!canWriteBlog(viewer)) throw new AppError('FORBIDDEN', 'You can’t write blogs yet.');
  if (!(await allCategoriesExist(db, input.categoryIds))) {
    throw validationError({ categoryIds: 'Choose categories from the list.' });
  }
  // The deferred trigger checks the category rules when this transaction commits.
  const id = await db.transaction().execute((trx) =>
    insertBlog(trx, {
      userId: viewer.id,
      type: 'discussion',
      title: input.title,
      body: input.content.body,
      content: input.content.content,
      categoryIds: input.categoryIds,
    }),
  );
  return getBlog(db, id);
}

/* ------------------------------------------------------------------- query */

export async function listQueryBlogs(db: Db): Promise<QueryBlogDto[]> {
  return (await selectQueryBlogs(db)).flatMap(toQueryBlogDto);
}

export async function getQueryBlog(db: Db, id: string): Promise<QueryBlogDto> {
  const rows = blogId.safeParse(id).success ? await selectQueryBlogs(db, id) : [];
  const [queryBlog] = rows.flatMap(toQueryBlogDto);
  if (!queryBlog) throw new AppError('NOT_FOUND', 'This Query Blog doesn’t exist or was removed.');
  return queryBlog;
}

export async function createQueryBlog(
  db: Db,
  viewer: Viewer,
  input: CreateQueryBlogInput,
): Promise<QueryBlogDto> {
  if (!canCreateQueryBlog(viewer)) {
    throw new AppError('FORBIDDEN', 'Only admins can start a Query Blog.');
  }
  if (!(await allCategoriesExist(db, [input.categoryId]))) {
    throw validationError({ categoryId: 'Choose a category from the list.' });
  }

  // The blog and its log entry commit together. The one-per-category rule is checked at
  // commit (deferred trigger), so a duplicate leaves no entry either.
  let id: string;
  try {
    id = await db.transaction().execute(async (trx) => {
      const blogId = await insertBlog(trx, {
        userId: viewer.id,
        type: 'query',
        title: input.title,
        body: input.description,
        content: null,
        categoryIds: [input.categoryId],
      });
      await logAdminAction(trx, {
        adminId: viewer.id,
        action: 'query_blog_created',
        targetId: blogId,
        targetLabel: input.title,
        reason: null,
      });
      return blogId;
    });
  } catch (error) {
    if (hasConstraint(error, 'blogs_one_query_blog_per_category')) {
      throw new AppError('CONFLICT', 'This category already has a Query Blog.');
    }
    throw error;
  }
  return getQueryBlog(db, id);
}

/* --------------------------------------------------------------- moderation */

/** A live blog of either type, for writes under it (comments) and moderation. */
export interface LiveBlog {
  id: string;
  type: BlogType;
  title: string;
  categoryIds: string[];
}

export async function getLiveBlog(db: Db, id: string): Promise<LiveBlog> {
  const row = blogId.safeParse(id).success ? await selectBlogForWrite(db, id) : undefined;
  if (!row) throw new AppError('NOT_FOUND', 'This blog doesn’t exist or was removed.');
  return { id: row.blog_id, type: row.type, title: row.title, categoryIds: row.category_ids };
}

/**
 * DELETE /blogs/:id. A discussion blog: its moderators. A Query Blog: admins only, logged
 * like a removal from the admin panel (without a reason).
 */
export async function deleteBlog(db: Db, viewer: Viewer, id: string): Promise<void> {
  const blog = await getLiveBlog(db, id);
  if (blog.type === 'query') {
    await removeQueryBlog(db, viewer, blog, null);
    return;
  }
  const actor = await getScopedActor(db, viewer);
  if (!canModerate(actor, blog.categoryIds)) {
    throw new AppError(
      'FORBIDDEN',
      'Only ambassadors for its categories, or admins, can remove this.',
    );
  }
  if (!(await softDeleteBlog(db, id, viewer.id))) {
    throw new AppError('NOT_FOUND', 'This blog was already removed.');
  }
}

/** DELETE /admin/query-blogs/:id: removes a whole Query Blog, with an optional reason. */
export async function deleteQueryBlog(
  db: Db,
  viewer: Viewer,
  id: string,
  reason: string | null,
): Promise<void> {
  const blog = await getLiveBlog(db, id);
  if (blog.type !== 'query') {
    throw new AppError('NOT_FOUND', 'This Query Blog doesn’t exist or was removed.');
  }
  await removeQueryBlog(db, viewer, blog, reason);
}

/**
 * Soft-deletes a Query Blog (the same mechanism as every blog removal) and logs it, in one
 * transaction. Its queries and answers stay stored but can no longer be reached, and its
 * category is free for a new Query Blog.
 */
async function removeQueryBlog(
  db: Db,
  viewer: Viewer,
  blog: LiveBlog,
  reason: string | null,
): Promise<void> {
  if (!canDeleteQueryBlog(viewer)) {
    throw new AppError('FORBIDDEN', 'Only admins can remove a Query Blog.');
  }
  await db.transaction().execute(async (trx) => {
    if (!(await softDeleteBlog(trx, blog.id, viewer.id))) {
      throw new AppError('NOT_FOUND', 'This Query Blog was already removed.');
    }
    await logAdminAction(trx, {
      adminId: viewer.id,
      action: 'query_blog_deleted',
      targetId: blog.id,
      targetLabel: blog.title,
      reason,
    });
  });
}

/* ------------------------------------------------------------------ mapping */

export function toAuthor(row: {
  author_id: string;
  author_name: string;
  author_occupation: string;
  author_avatar_url: string | null;
}): AuthorDto {
  return {
    id: row.author_id,
    name: row.author_name,
    occupation: row.author_occupation,
    avatarUrl: row.author_avatar_url,
  };
}

function toBlogDto(row: Awaited<ReturnType<typeof selectFeed>>[number]): BlogDto {
  return {
    id: row.blog_id,
    title: row.title,
    excerpt: row.excerpt,
    categories: row.categories,
    author: toAuthor(row),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    readTimeMinutes: Math.max(1, Math.round(row.word_count / WORDS_PER_MINUTE)),
    commentCount: row.comment_count ?? 0,
  };
}

/** Empty when the category is missing, which the database rules make impossible. */
function toQueryBlogDto(row: Awaited<ReturnType<typeof selectQueryBlogs>>[number]): QueryBlogDto[] {
  if (!row.category) return [];
  return [
    {
      id: row.blog_id,
      title: row.title,
      description: row.description,
      category: row.category,
      author: toAuthor(row),
      createdAt: row.created_at.toISOString(),
      queryCount: row.query_count ?? 0,
      lastActivityAt: row.last_activity_at.toISOString(),
    },
  ];
}

function hasConstraint(error: unknown, constraint: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'constraint' in error &&
    error.constraint === constraint
  );
}
