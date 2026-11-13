import type { Page } from '../../../lib/usePagedList';
import type { Category } from '../../categories/types';
import type { RichDoc } from './richText';

/**
 * Domain models for the Blogs feature, as the UI uses them. The HTTP layer
 * (api/httpBlogsApi.ts) maps API responses into these shapes.
 * Timestamps are ISO-8601 strings, as they arrive over the wire.
 */

export type { Category, Page };

/** A person as the Blogs section shows them. */
export interface User {
  id: string;
  name: string;
  /** Their occupation. Plain descriptive text, not a role. */
  profession: string;
  /** One or two letters for the generated avatar. */
  initials: string;
}

export interface Blog {
  id: string;
  title: string;
  /** The start of the body, for feed cards ("…" when shortened). */
  excerpt: string;
  /** Plain text, paragraphs separated by a blank line. Null until the blog itself is fetched. */
  body: string | null;
  /** The formatted document (fetched with the body); null for blogs without formatting. */
  content: RichDoc | null;
  /** One or more. Ambassadors for any of them can moderate the blog. */
  categories: Category[];
  author: User;
  createdAt: string;
  readTimeMinutes: number;
  /** Live comments including replies. */
  commentCount: number;
}

/** A pinned topic space: one per category, started by an ambassador or admin. */
export interface QueryBlog {
  id: string;
  title: string;
  description: string;
  category: Category;
  /** Live top-level queries. */
  queryCount: number;
  lastActivityAt: string;
}

/** What a comment thread hangs off: a discussion blog, or a Query Blog. */
export type CommentSubject =
  { kind: 'blog'; blogId: string } | { kind: 'query'; queryBlogId: string };

/**
 * One entry in a thread. Threads are flat lists; the tree is rebuilt from
 * `parentId` on the client. On a Query Blog, a top-level comment is a query.
 * A removed comment keeps its place (so its replies stay attached) but has no body.
 */
export interface Comment {
  id: string;
  subject: CommentSubject;
  parentId: string | null;
  author: User;
  body: string | null;
  removed: boolean;
  createdAt: string;
}

export interface NewBlogInput {
  title: string;
  content: RichDoc;
  categoryIds: string[];
}

/** An entry in "My blogs": a discussion blog or a Query Blog the member started. */
export interface MyBlog extends Blog {
  type: 'discussion' | 'query';
}

/** An entry in "My comments": what was written, and where. */
export interface MyComment {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  blog: { id: string; title: string; type: 'discussion' | 'query' };
}

export interface NewQueryBlogInput {
  categoryId: string;
  title: string;
  description: string;
}

export interface NewCommentInput {
  subject: CommentSubject;
  parentId: string | null;
  body: string;
}
