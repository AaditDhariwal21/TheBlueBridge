import type {
  Blog,
  Comment,
  CommentSubject,
  MyBlog,
  MyComment,
  NewBlogInput,
  NewCommentInput,
  NewQueryBlogInput,
  Page,
  QueryBlog,
} from '../model/types';

/**
 * The Blogs data contract. The UI talks only to an object of this shape
 * (state/hooks.ts), implemented over the API by httpBlogsApi.ts.
 *
 * Reads are public. Writes need a signed-in, approved member; identity comes
 * from the access token on the server, so create calls take no author.
 * Failures throw ApiError (lib/api.ts).
 */
export interface BlogsApi {
  /**
   * Newest first; with `q`, most relevant first. `categoryIds` keeps blogs in any of them.
   * Pass the previous page's `nextCursor` to continue. Items carry no body.
   */
  listBlogs(
    params: { cursor: string | null; limit: number; q?: string; categoryIds?: readonly string[] },
    signal?: AbortSignal,
  ): Promise<Page<Blog>>;
  /** Resolves to `null` when no live blog has this id. */
  getBlog(id: string): Promise<Blog | null>;
  createBlog(input: NewBlogInput): Promise<Blog>;
  /** Moderators only, for discussion blogs. */
  deleteBlog(id: string): Promise<void>;

  listComments(subject: CommentSubject): Promise<Comment[]>;
  createComment(input: NewCommentInput): Promise<Comment>;
  /** Moderators only. The comment stays in the thread as "removed". */
  deleteComment(subject: CommentSubject, commentId: string): Promise<void>;

  listQueryBlogs(): Promise<QueryBlog[]>;
  /** Resolves to `null` when no live Query Blog has this id. */
  getQueryBlog(id: string): Promise<QueryBlog | null>;
  /** Admins only. One per category. Logged in the admin activity log. */
  createQueryBlog(input: NewQueryBlogInput): Promise<QueryBlog>;
  /** Admins only: removes a Query Blog and its queries, with an optional logged reason. */
  deleteQueryBlog(id: string, reason: string | null): Promise<void>;

  /** The signed-in member's own blogs and Query Blogs, newest first. */
  listMyBlogs(params: { cursor: string | null; limit: number }): Promise<Page<MyBlog>>;
  /** The signed-in member's own live comments, queries and replies, newest first. */
  listMyComments(params: { cursor: string | null; limit: number }): Promise<Page<MyComment>>;

  /** A member's live blogs and Query Blogs, newest first (on their profile; approved viewers). */
  listAuthorBlogs(params: {
    authorId: string;
    cursor: string | null;
    limit: number;
  }): Promise<Page<MyBlog>>;
  /** A member's live comments, queries and replies, newest first (on their profile). */
  listAuthorComments(params: {
    authorId: string;
    cursor: string | null;
    limit: number;
  }): Promise<Page<MyComment>>;
}
