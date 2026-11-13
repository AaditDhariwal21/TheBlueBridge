import { ApiError, apiRequest } from '../../../lib/api';
import { getAccessToken } from '../../auth/session';
import type { Category } from '../../categories/types';
import { initialsOf } from '../lib/text';
import type { RichDoc } from '../model/richText';
import type {
  Blog,
  Comment,
  CommentSubject,
  MyBlog,
  MyComment,
  Page,
  QueryBlog,
  User,
} from '../model/types';
import type { BlogsApi } from './contract';

/* Wire shapes (server/src/features/blogs and comments). */

interface AuthorDto {
  id: string;
  name: string;
  occupation: string;
  avatarUrl: string | null;
}

interface BlogDto {
  id: string;
  title: string;
  excerpt: string;
  body?: string;
  content?: RichDoc | null;
  categories: Category[];
  author: AuthorDto;
  createdAt: string;
  readTimeMinutes: number;
  commentCount: number;
}

interface QueryBlogDto {
  id: string;
  title: string;
  description: string;
  category: Category;
  queryCount: number;
  lastActivityAt: string;
}

interface CommentDto {
  id: string;
  parentId: string | null;
  author: AuthorDto;
  body: string | null;
  removed: boolean;
  createdAt: string;
}

const toUser = (author: AuthorDto): User => ({
  id: author.id,
  name: author.name,
  profession: author.occupation,
  initials: initialsOf(author.name),
});

const toBlog = (dto: BlogDto): Blog => ({
  id: dto.id,
  title: dto.title,
  excerpt: dto.excerpt,
  body: dto.body ?? null,
  content: dto.content ?? null,
  categories: dto.categories,
  author: toUser(dto.author),
  createdAt: dto.createdAt,
  readTimeMinutes: dto.readTimeMinutes,
  commentCount: dto.commentCount,
});

const toQueryBlog = (dto: QueryBlogDto): QueryBlog => ({
  id: dto.id,
  title: dto.title,
  description: dto.description,
  category: dto.category,
  queryCount: dto.queryCount,
  lastActivityAt: dto.lastActivityAt,
});

const toComment = (subject: CommentSubject, dto: CommentDto): Comment => ({
  id: dto.id,
  subject,
  parentId: dto.parentId,
  author: toUser(dto.author),
  body: dto.body,
  removed: dto.removed,
  createdAt: dto.createdAt,
});

/** Discussion blogs and Query Blogs are both blogs to the API. */
const blogIdOf = (subject: CommentSubject) =>
  subject.kind === 'blog' ? subject.blogId : subject.queryBlogId;

const path = (...parts: string[]) => '/' + parts.map(encodeURIComponent).join('/');

function pageQuery({ cursor, limit }: { cursor: string | null; limit: number }): string {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor !== null) params.set('cursor', cursor);
  return params.toString();
}

/** A 404 means "no such thing" to the UI, not an error. */
async function orNull<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

function feedQuery(params: {
  cursor: string | null;
  limit: number;
  q?: string;
  categoryIds?: readonly string[];
}): string {
  const query = new URLSearchParams(pageQuery(params));
  if (params.q) query.set('q', params.q);
  if (params.categoryIds?.length) query.set('categories', params.categoryIds.join(','));
  return query.toString();
}

async function write(method: 'POST' | 'DELETE', url: string, body?: unknown): Promise<unknown> {
  return apiRequest(url, {
    method,
    token: await getAccessToken(),
    ...(body !== undefined && { body }),
  });
}

/** One author's blogs (signed-in requests: the viewer's own, or a member's on their profile). */
async function blogsBy(url: string): Promise<Page<MyBlog>> {
  const data = (await apiRequest(url, { token: await getAccessToken() })) as {
    blogs: (BlogDto & { type: MyBlog['type'] })[];
    nextCursor: string | null;
  };
  return {
    items: data.blogs.map((dto) => ({ ...toBlog(dto), type: dto.type })),
    nextCursor: data.nextCursor,
  };
}

/** One author's comments, queries and replies, with the blog each is on. */
async function commentsBy(url: string): Promise<Page<MyComment>> {
  const data = (await apiRequest(url, { token: await getAccessToken() })) as {
    comments: MyComment[];
    nextCursor: string | null;
  };
  return { items: data.comments, nextCursor: data.nextCursor };
}

export const httpBlogsApi: BlogsApi = {
  async listBlogs(params, signal) {
    const data = (await apiRequest(`/blogs?${feedQuery(params)}`, { signal })) as {
      blogs: BlogDto[];
      nextCursor: string | null;
    };
    return { items: data.blogs.map(toBlog), nextCursor: data.nextCursor };
  },

  async getBlog(id) {
    const data = await orNull(apiRequest(path('blogs', id)) as Promise<{ blog: BlogDto }>);
    return data && toBlog(data.blog);
  },

  async createBlog(input) {
    const data = (await write('POST', '/blogs', input)) as { blog: BlogDto };
    return toBlog(data.blog);
  },

  async deleteBlog(id) {
    await write('DELETE', path('blogs', id));
  },

  async listComments(subject) {
    const data = (await apiRequest(path('blogs', blogIdOf(subject), 'comments'))) as {
      comments: CommentDto[];
    };
    return data.comments.map((dto) => toComment(subject, dto));
  },

  async createComment({ subject, parentId, body }) {
    const data = (await write('POST', path('blogs', blogIdOf(subject), 'comments'), {
      parentId,
      body,
    })) as { comment: CommentDto };
    return toComment(subject, data.comment);
  },

  async deleteComment(subject, commentId) {
    await write('DELETE', path('blogs', blogIdOf(subject), 'comments', commentId));
  },

  async listQueryBlogs() {
    const data = (await apiRequest('/query-blogs')) as { queryBlogs: QueryBlogDto[] };
    return data.queryBlogs.map(toQueryBlog);
  },

  async getQueryBlog(id) {
    const data = await orNull(
      apiRequest(path('query-blogs', id)) as Promise<{ queryBlog: QueryBlogDto }>,
    );
    return data && toQueryBlog(data.queryBlog);
  },

  async createQueryBlog(input) {
    const data = (await write('POST', '/admin/query-blogs', input)) as { queryBlog: QueryBlogDto };
    return toQueryBlog(data.queryBlog);
  },

  async deleteQueryBlog(id, reason) {
    await write('DELETE', path('admin', 'query-blogs', id), { reason });
  },

  listMyBlogs: (page) => blogsBy(`/me/blogs?${pageQuery(page)}`),
  listMyComments: (page) => commentsBy(`/me/comments?${pageQuery(page)}`),
  listAuthorBlogs: ({ authorId, ...page }) =>
    blogsBy(`${path('members', authorId, 'blogs')}?${pageQuery(page)}`),
  listAuthorComments: ({ authorId, ...page }) =>
    commentsBy(`${path('members', authorId, 'comments')}?${pageQuery(page)}`),
};
