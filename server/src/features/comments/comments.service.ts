import { z } from 'zod';

import type { BlogType, Db } from '../../db/schema.ts';
import { encodeCursor, paginate, type Cursor } from '../../lib/cursor.ts';
import { AppError } from '../../lib/errors.ts';
import type { Viewer } from '../../middleware/authenticate.ts';
import {
  canComment,
  canModerate,
  canPostQuery,
  canReplyUnderQuery,
} from '../../policies/permissions.ts';
import { getLiveBlog, toAuthor, type AuthorDto, type LiveBlog } from '../blogs/blogs.service.ts';
import { getScopedActor } from '../users/users.service.ts';
import {
  findReplyTarget,
  insertComment,
  selectAuthorComments,
  selectComment,
  selectThread,
  softDeleteComment,
} from './comments.repository.ts';
import type { CreateCommentInput } from './comments.schemas.ts';

/**
 * One entry in a blog's thread. On a Query Blog a top-level comment is a query
 * and its replies are answers. A removed comment keeps its place (so replies
 * stay attached) but has no body.
 */
export interface CommentDto {
  id: string;
  blogId: string;
  parentId: string | null;
  author: AuthorDto;
  body: string | null;
  removed: boolean;
  createdAt: string;
}

/** An item in "My comments": the comment and the blog it is on. */
export interface MyCommentDto {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  blog: { id: string; title: string; type: BlogType };
}

const commentId = z.uuid();

/**
 * One author's live comments, queries and replies on live blogs, newest first: the viewer's
 * own (GET /me/comments) or a member's, from their profile (GET /members/:id/comments).
 */
export async function listAuthorComments(
  db: Db,
  authorId: string,
  page: { limit: number; cursor?: Cursor | undefined },
): Promise<{ comments: MyCommentDto[]; nextCursor: string | null }> {
  if (!commentId.safeParse(authorId).success) throw new AppError('NOT_FOUND', 'Member not found.');
  const rows = await selectAuthorComments(db, authorId, page);
  const { items, nextCursor } = paginate(rows, page.limit, (row) =>
    encodeCursor({ createdAt: row.created_at_key, id: row.comment_id }),
  );
  return {
    comments: items.map((row) => ({
      id: row.comment_id,
      parentId: row.parent_comment_id,
      body: row.body,
      createdAt: row.created_at.toISOString(),
      blog: { id: row.blog_id, title: row.blog_title, type: row.blog_type },
    })),
    nextCursor,
  };
}

export async function listComments(db: Db, blogId: string): Promise<CommentDto[]> {
  const blog = await getLiveBlog(db, blogId);
  return (await selectThread(db, blog.id)).map(toCommentDto);
}

export async function createComment(
  db: Db,
  viewer: Viewer,
  blogId: string,
  input: CreateCommentInput,
): Promise<CommentDto> {
  const blog = await getLiveBlog(db, blogId);
  const target =
    input.parentId === null ? null : await findReplyTarget(db, blog.id, input.parentId);
  if (target === undefined) {
    throw new AppError('NOT_FOUND', 'The comment you’re replying to is no longer available.');
  }

  if (!(await mayPost(db, viewer, blog, target))) {
    throw new AppError(
      'FORBIDDEN',
      blog.type === 'query' && target !== null
        ? 'Only the person who asked, ambassadors for this topic and admins can reply to a query.'
        : 'You can’t post here yet.',
    );
  }

  const id = await insertComment(db, { blogId: blog.id, userId: viewer.id, ...input });
  const row = await selectComment(db, id);
  if (!row) throw new Error('Inserted comment not found');
  return toCommentDto(row);
}

/** Discussion: any approved member. Query Blog: anyone approved asks; replies follow the query rule. */
async function mayPost(
  db: Db,
  viewer: Viewer,
  blog: LiveBlog,
  target: { rootAuthorId: string } | null,
): Promise<boolean> {
  if (blog.type === 'discussion') return canComment(viewer);
  if (target === null) return canPostQuery(viewer);
  const [categoryId] = blog.categoryIds;
  if (categoryId === undefined) return false;
  return canReplyUnderQuery(await getScopedActor(db, viewer), {
    authorId: target.rootAuthorId,
    categoryId,
  });
}

/** Moderators remove comments, queries and answers on blogs in their categories. */
export async function deleteComment(
  db: Db,
  viewer: Viewer,
  blogId: string,
  id: string,
): Promise<void> {
  const blog = await getLiveBlog(db, blogId);
  if (!canModerate(await getScopedActor(db, viewer), blog.categoryIds)) {
    throw new AppError(
      'FORBIDDEN',
      'Only ambassadors for its categories, or admins, can remove this.',
    );
  }
  const removed =
    commentId.safeParse(id).success && (await softDeleteComment(db, blog.id, id, viewer.id));
  if (!removed) {
    throw new AppError('NOT_FOUND', 'This comment doesn’t exist or was already removed.');
  }
}

function toCommentDto(row: Awaited<ReturnType<typeof selectThread>>[number]): CommentDto {
  return {
    id: row.comment_id,
    blogId: row.blog_id,
    parentId: row.parent_comment_id,
    author: toAuthor(row),
    body: row.body,
    removed: row.removed,
    createdAt: row.created_at.toISOString(),
  };
}
