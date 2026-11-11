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
  /** Newest first. Pass the previous page's `nextCursor` to continue. Items carry no body. */
  listBlogs(params: { cursor: string | null; limit: number }): Promise<Page<Blog>>;
  /** Resolves to `null` when no live blog has this id. */
  getBlog(id: string): Promise<Blog | null>;
  createBlog(input: NewBlogInput): Promise<Blog>;
  /** Moderators only. Works for Query Blogs too. */
  deleteBlog(id: string): Promise<void>;

  listComments(subject: CommentSubject): Promise<Comment[]>;
  createComment(input: NewCommentInput): Promise<Comment>;
  /** Moderators only. The comment stays in the thread as "removed". */
  deleteComment(subject: CommentSubject, commentId: string): Promise<void>;

  listQueryBlogs(): Promise<QueryBlog[]>;
  /** Resolves to `null` when no live Query Blog has this id. */
  getQueryBlog(id: string): Promise<QueryBlog | null>;
  /** Admins only. One per category. */
  createQueryBlog(input: NewQueryBlogInput): Promise<QueryBlog>;

  /** The signed-in member's own blogs and Query Blogs, newest first. */
  listMyBlogs(params: { cursor: string | null; limit: number }): Promise<Page<MyBlog>>;
  /** The signed-in member's own live comments, queries and replies, newest first. */
  listMyComments(params: { cursor: string | null; limit: number }): Promise<Page<MyComment>>;
}
