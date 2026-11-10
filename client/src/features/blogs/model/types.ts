/**
 * Domain models for the Blogs feature. These mirror what a real API would
 * return, so the UI never depends on how the mock layer stores data.
 * Timestamps are ISO-8601 strings, as they would arrive over the wire.
 */

export interface User {
  id: string;
  name: string;
  /** Plain descriptive text, e.g. "Chartered Accountant". Not a role. */
  profession: string;
  /** One or two letters for the generated avatar. */
  initials: string;
}

export type CategoryId =
  'career' | 'finance' | 'health' | 'entrepreneurship' | 'work-life' | 'local' | 'tech';

export interface Category {
  id: CategoryId;
  label: string;
  /** Which brand accent the category's dot uses. Decorative only. */
  tone: 'blue' | 'pink';
}

export interface Blog {
  id: string;
  title: string;
  /** Plain text. Paragraphs are separated by a blank line. */
  body: string;
  categoryId: CategoryId;
  author: User;
  createdAt: string;
  readTimeMinutes: number;
  /** Total comments including replies. */
  commentCount: number;
}

export interface QueryBlog {
  slug: string;
  topic: string;
  description: string;
  /** Number of top-level queries. */
  queryCount: number;
  lastActivityAt: string;
  tone: 'blue' | 'pink';
}

/** What a comment thread hangs off: a blog, or a Query Blog topic. */
export type CommentSubject =
  { kind: 'blog'; blogId: string } | { kind: 'query'; topicSlug: string };

/**
 * One entry in a thread. Threads are flat lists; the tree is rebuilt from
 * `parentId` on the client. On a Query Blog, a top-level comment is a query.
 */
export interface Comment {
  id: string;
  subject: CommentSubject;
  parentId: string | null;
  author: User;
  body: string;
  createdAt: string;
}

/** A cursor-paginated slice of a list. `nextCursor` is null at the end. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface NewBlogInput {
  title: string;
  body: string;
  categoryId: CategoryId;
}

export interface NewCommentInput {
  subject: CommentSubject;
  parentId: string | null;
  body: string;
}
