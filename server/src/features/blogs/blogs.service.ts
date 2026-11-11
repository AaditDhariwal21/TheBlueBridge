import { z } from 'zod';

import type { BlogType, Db } from '../../db/schema.ts';
import { paginate, type Cursor } from '../../lib/cursor.ts';
import { AppError, validationError } from '../../lib/errors.ts';
import type { RichDoc } from '../../lib/richText.ts';
import type { Viewer } from '../../middleware/authenticate.ts';
import { canCreateQueryBlog, canModerate, canWriteBlog } from '../../policies/permissions.ts';
import { allCategoriesExist, type Category } from '../categories/categories.service.ts';
import { getScopedActor } from '../users/users.service.ts';
import {
  insertBlog,
  selectAuthorBlogs,
  selectBlogForWrite,
  selectDiscussionBlog,
  selectFeed,
  selectQueryBlogs,
  softDeleteBlog,
} from './blogs.repository.ts';
import type { CreateBlogInput, CreateQueryBlogInput } from './blogs.schemas.ts';

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

export async function listFeed(
  db: Db,
  page: { limit: number; cursor?: Cursor | undefined },
): Promise<{ blogs: BlogDto[]; nextCursor: string | null }> {
  const rows = await selectFeed(db, page);
  const { items, nextCursor } = paginate(rows, page.limit, (row) => ({
    createdAt: row.created_at_key,
    id: row.blog_id,
  }));
  return { blogs: items.map(toBlogDto), nextCursor };
}

export async function getBlog(db: Db, id: string): Promise<BlogDetailDto> {
  const row = blogId.safeParse(id).success ? await selectDiscussionBlog(db, id) : undefined;
  if (!row) throw new AppError('NOT_FOUND', 'This blog doesn’t exist or was removed.');
  return { ...toBlogDto(row), body: row.body, content: row.content };
}

/** The viewer's own live blogs and Query Blogs, newest first. */
export async function listMyBlogs(
  db: Db,
  viewer: Viewer,
  page: { limit: number; cursor?: Cursor | undefined },
): Promise<{ blogs: MyBlogDto[]; nextCursor: string | null }> {
  const rows = await selectAuthorBlogs(db, viewer.id, page);
  const { items, nextCursor } = paginate(rows, page.limit, (row) => ({
    createdAt: row.created_at_key,
    id: row.blog_id,
  }));
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

  let id: string;
  try {
    id = await db.transaction().execute((trx) =>
      insertBlog(trx, {
        userId: viewer.id,
        type: 'query',
        title: input.title,
        body: input.description,
        content: null,
        categoryIds: [input.categoryId],
      }),
    );
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
  categoryIds: string[];
}

export async function getLiveBlog(db: Db, id: string): Promise<LiveBlog> {
  const row = blogId.safeParse(id).success ? await selectBlogForWrite(db, id) : undefined;
  if (!row) throw new AppError('NOT_FOUND', 'This blog doesn’t exist or was removed.');
  return { id: row.blog_id, type: row.type, categoryIds: row.category_ids };
}

/** Soft-deletes a blog of either type (a Query Blog's category becomes free again). */
export async function deleteBlog(db: Db, viewer: Viewer, id: string): Promise<void> {
  const blog = await getLiveBlog(db, id);
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
