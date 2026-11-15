import { useCallback, useMemo } from 'react';

import { setQueryData, updateQueriesWhere, updateQueryData } from '../../../lib/queryCache';
import { usePagedList, type ListData, type PagedList } from '../../../lib/usePagedList';
import { useQuery, useQueryData } from '../../../lib/useQuery';
import { blogsApi } from '../api';
import { subjectFromKey, subjectKey, type SubjectKey } from '../lib/subject';
import type {
  Blog,
  Comment,
  CommentSubject,
  NewBlogInput,
  NewQueryBlogInput,
  QueryBlog,
} from '../model/types';

/**
 * The only way UI components read or change Blogs data. Everything is cached in the app's
 * query cache (lib/queryCache.ts) under the keys below: shown at once when cached, loaded
 * again whenever a view mounts and when the tab regains focus, and updated in place by the
 * actions here so a change shows everywhere at once.
 */

const KEYS = {
  /** The Feed, newest first. Searches and filters are `blogs/feed?…`. */
  feed: 'blogs/feed',
  feedSearch: (q: string, categories: string) =>
    `blogs/feed?q=${encodeURIComponent(q)}&categories=${categories}`,
  /** A discussion blog with its body; null when it doesn't exist (or was removed). */
  blog: (id: string) => `blogs/blog/${id}`,
  thread: (key: SubjectKey) => `blogs/thread/${key}`,
  queryBlogs: 'blogs/query-blogs',
  /** A Query Blog; null when it doesn't exist (or was removed). */
  queryBlog: (id: string) => `blogs/query-blog/${id}`,
  /** The blog this session just published, so the Feed can highlight it. */
  justPublished: 'blogs/just-published',
};

const isFeedKey = (key: string) => key === KEYS.feed || key.startsWith(`${KEYS.feed}?`);

/** For single resources fetched by id. */
export type ItemStatus = 'loading' | 'ready' | 'missing' | 'error';

/* --------------------------------------------------------------------- feed */

export const FEED_PAGE_SIZE = 5;

export interface FeedResult extends PagedList<Blog> {
  justPublishedId: string | null;
  markHighlightSeen: () => void;
}

const fetchFeedPage = (cursor: string | null, limit: number, signal: AbortSignal) =>
  blogsApi.listBlogs({ cursor, limit }, signal);

export function useFeed(): FeedResult {
  const list = usePagedList(KEYS.feed, fetchFeedPage, { pageSize: FEED_PAGE_SIZE });
  const justPublishedId = useQueryData<string | null>(KEYS.justPublished, null);
  const markHighlightSeen = useCallback(() => {
    setQueryData(KEYS.justPublished, null);
  }, []);
  return { ...list, justPublishedId, markHighlightSeen };
}

/**
 * The Feed searched and/or filtered by category, cached per search. Each search has its own
 * key, so a slow answer for an older search can never replace a newer one.
 */
export function useFeedSearch(q: string, categoryIds: readonly string[]): PagedList<Blog> {
  const categories = [...categoryIds].sort().join(',');
  const fetchPage = useCallback(
    (cursor: string | null, limit: number, signal: AbortSignal) =>
      blogsApi.listBlogs(
        {
          cursor,
          limit,
          ...(q && { q }),
          ...(categories && { categoryIds: categories.split(',') }),
        },
        signal,
      ),
    [q, categories],
  );
  return usePagedList(KEYS.feedSearch(q, categories), fetchPage, { pageSize: FEED_PAGE_SIZE });
}

export function useCreateBlog(): (input: NewBlogInput) => Promise<Blog> {
  return useCallback(async (input) => {
    const blog = await blogsApi.createBlog(input);
    setQueryData(KEYS.blog(blog.id), blog);
    setQueryData(KEYS.thread(subjectKey({ kind: 'blog', blogId: blog.id })), []);
    updateQueryData<ListData<Blog>>(KEYS.feed, (list) => ({
      ...list,
      items: [blog, ...list.items.filter((b) => b.id !== blog.id)],
    }));
    setQueryData(KEYS.justPublished, blog.id);
    return blog;
  }, []);
}

/** Moderators: removes a discussion blog. Rejects on failure. */
export function useDeleteBlog(): (id: string) => Promise<void> {
  return useCallback(async (id) => {
    await blogsApi.deleteBlog(id);
    setQueryData(KEYS.blog(id), null);
    updateQueriesWhere<ListData<Blog>>(isFeedKey, (list) => ({
      ...list,
      items: list.items.filter((b) => b.id !== id),
    }));
  }, []);
}

/* --------------------------------------------------------------- one blog */

export interface ItemResult<T> {
  data: T | undefined;
  status: ItemStatus;
  retry: () => void;
}

function toItem<T>(query: {
  data: T | null | undefined;
  status: 'loading' | 'ready' | 'error';
  retry: () => void;
}): ItemResult<T> {
  if (query.status !== 'ready')
    return { data: undefined, status: query.status, retry: query.retry };
  return query.data
    ? { data: query.data, status: 'ready', retry: query.retry }
    : { data: undefined, status: 'missing', retry: query.retry };
}

export function useBlog(id: string): ItemResult<Blog> {
  return toItem(useQuery(KEYS.blog(id), (signal) => blogsApi.getBlog(id, signal)));
}

/* ----------------------------------------------------------------- threads */

export interface ThreadResult {
  comments: Comment[];
  status: 'loading' | 'ready' | 'error';
  retry: () => void;
  /** Posts as the signed-in member. Rejects on failure so the composer can say so. */
  post: (parentId: string | null, body: string) => Promise<Comment>;
  /** Moderators: removes a comment. Rejects on failure. */
  remove: (commentId: string) => Promise<void>;
}

const NO_COMMENTS: Comment[] = [];

export function useThread(subject: CommentSubject): ThreadResult {
  const key = subjectKey(subject);
  // `subject` is usually a fresh object each render; the key is its identity.
  const stableSubject = useMemo(() => subjectFromKey(key), [key]);
  const threadKey = KEYS.thread(key);
  const thread = useQuery(threadKey, (signal) => blogsApi.listComments(stableSubject, signal));

  const post = useCallback(
    async (parentId: string | null, body: string) => {
      const comment = await blogsApi.createComment({ subject: stableSubject, parentId, body });
      updateQueryData<Comment[]>(threadKey, (comments) => [...comments, comment]);
      changeCounts(comment, 1);
      return comment;
    },
    [stableSubject, threadKey],
  );

  const remove = useCallback(
    async (commentId: string) => {
      await blogsApi.deleteComment(stableSubject, commentId);
      const target = thread.data?.find((c) => c.id === commentId);
      // Like the API: a removed comment keeps no text or author. The thread drops it unless
      // live replies still hang from it.
      updateQueryData<Comment[]>(threadKey, (comments) =>
        comments.map((c) =>
          c.id === commentId ? { ...c, removed: true, body: null, author: null } : c,
        ),
      );
      if (target && !target.removed) changeCounts(target, -1);
    },
    [stableSubject, threadKey, thread.data],
  );

  return {
    comments: thread.data ?? NO_COMMENTS,
    status: thread.status,
    retry: thread.retry,
    post,
    remove,
  };
}

/** Keeps the counts shown on cards and pages in step with a comment added (+1) or removed (-1). */
function changeCounts(comment: Comment, delta: 1 | -1): void {
  if (comment.subject.kind === 'blog') {
    const id = comment.subject.blogId;
    const bump = (blog: Blog) =>
      blog.id === id ? { ...blog, commentCount: blog.commentCount + delta } : blog;
    updateQueryData<Blog | null>(KEYS.blog(id), (blog) => blog && bump(blog));
    updateQueriesWhere<ListData<Blog>>(isFeedKey, (list) => ({
      ...list,
      items: list.items.map(bump),
    }));
    return;
  }
  const id = comment.subject.queryBlogId;
  const bump = (queryBlog: QueryBlog) =>
    queryBlog.id === id
      ? {
          ...queryBlog,
          queryCount: queryBlog.queryCount + (comment.parentId === null ? delta : 0),
          lastActivityAt: delta > 0 ? comment.createdAt : queryBlog.lastActivityAt,
        }
      : queryBlog;
  updateQueryData<QueryBlog | null>(
    KEYS.queryBlog(id),
    (queryBlog) => queryBlog && bump(queryBlog),
  );
  updateQueryData<QueryBlog[]>(KEYS.queryBlogs, (list) => list.map(bump));
}

/* ------------------------------------------------------------ query blogs */

export interface QueryBlogsResult {
  queryBlogs: QueryBlog[];
  status: 'loading' | 'ready' | 'error';
  retry: () => void;
}

const NO_QUERY_BLOGS: QueryBlog[] = [];
const fetchQueryBlogs = (signal: AbortSignal) => blogsApi.listQueryBlogs(signal);

export function useQueryBlogs(): QueryBlogsResult {
  const { data, status, retry } = useQuery(KEYS.queryBlogs, fetchQueryBlogs);
  return { queryBlogs: data ?? NO_QUERY_BLOGS, status, retry };
}

/** A Query Blog; shown at once from the Query Blogs list when that is cached. */
export function useQueryBlog(id: string): ItemResult<QueryBlog> {
  const detail = toItem(
    useQuery(KEYS.queryBlog(id), (signal) => blogsApi.getQueryBlog(id, signal)),
  );
  const listed = useQueryData(KEYS.queryBlogs, NO_QUERY_BLOGS).find((q) => q.id === id);
  if (detail.status === 'loading' && listed) {
    return { data: listed, status: 'ready', retry: detail.retry };
  }
  return detail;
}

/** Admins. Rejects on failure, e.g. 409 if the category has one. */
export function useCreateQueryBlog(): (input: NewQueryBlogInput) => Promise<QueryBlog> {
  return useCallback(async (input) => {
    const queryBlog = await blogsApi.createQueryBlog(input);
    setQueryData(KEYS.queryBlog(queryBlog.id), queryBlog);
    setQueryData(KEYS.thread(subjectKey({ kind: 'query', queryBlogId: queryBlog.id })), []);
    updateQueryData<QueryBlog[]>(KEYS.queryBlogs, (list) => [
      queryBlog,
      ...list.filter((q) => q.id !== queryBlog.id),
    ]);
    return queryBlog;
  }, []);
}

/** Admins: removes a Query Blog (its category can then get a new one). Rejects on failure. */
export function useDeleteQueryBlog(): (id: string, reason: string | null) => Promise<void> {
  return useCallback(async (id, reason) => {
    await blogsApi.deleteQueryBlog(id, reason);
    setQueryData(KEYS.queryBlog(id), null);
    updateQueryData<QueryBlog[]>(KEYS.queryBlogs, (list) => list.filter((q) => q.id !== id));
  }, []);
}
