import type {
  Blog,
  Comment,
  CommentSubject,
  NewBlogInput,
  NewCommentInput,
  Page,
  QueryBlog,
} from '../model/types';

/**
 * The Blogs data contract. The UI talks only to an object of this shape.
 * Today it is backed by an in-memory mock (`mockBlogsApi.ts`); a real
 * implementation would `fetch('/api/...')` and map responses to these types.
 *
 * Identity comes from the session on the server side, so create calls take
 * no author.
 */
export interface BlogsApi {
  /** Newest first. Pass the previous page's `nextCursor` to continue. */
  listBlogs(params: { cursor: string | null; limit: number }): Promise<Page<Blog>>;
  /** Resolves to `null` when no blog has this id. */
  getBlog(id: string): Promise<Blog | null>;
  createBlog(input: NewBlogInput): Promise<Blog>;

  listComments(subject: CommentSubject): Promise<Comment[]>;
  createComment(input: NewCommentInput): Promise<Comment>;

  listQueryBlogs(): Promise<QueryBlog[]>;
  /** Resolves to `null` when no topic has this slug. */
  getQueryBlog(slug: string): Promise<QueryBlog | null>;
}

/** Thrown by implementations when a request fails; the UI shows a retry. */
export class BlogsApiError extends Error {
  override readonly name = 'BlogsApiError';
}
