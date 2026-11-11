import { useCallback, useContext, useEffect, useMemo } from 'react';

import { blogsApi } from '../api';
import { subjectFromKey, subjectKey } from '../lib/subject';
import type {
  Blog,
  Comment,
  CommentSubject,
  NewBlogInput,
  NewQueryBlogInput,
  QueryBlog,
} from '../model/types';
import { BlogsContext, type BlogsStore, type ItemStatus, type LoadStatus } from './store';

/**
 * The only way UI components read or change Blogs data. Each hook fetches
 * through `blogsApi` on first use and serves from the session cache after.
 */

function useBlogsStore(): BlogsStore {
  const store = useContext(BlogsContext);
  if (!store) throw new Error('Blogs hooks must be used inside <BlogsProvider>.');
  return store;
}

const isDefined = <T>(value: T | undefined): value is T => value !== undefined;

/* --------------------------------------------------------------------- feed */

export const FEED_PAGE_SIZE = 5;

export interface FeedResult {
  blogs: Blog[];
  status: LoadStatus;
  hasMore: boolean;
  justPublishedId: string | null;
  loadMore: () => void;
  markHighlightSeen: () => void;
}

export function useFeed(): FeedResult {
  const { state, dispatch, once } = useBlogsStore();
  const { feed } = state;
  const { nextCursor, done, status } = feed;

  const loadMore = useCallback(() => {
    if (done) return;
    once('feed', async () => {
      dispatch({ type: 'feed/request' });
      try {
        const page = await blogsApi.listBlogs({ cursor: nextCursor, limit: FEED_PAGE_SIZE });
        dispatch({ type: 'feed/received', page });
      } catch {
        dispatch({ type: 'feed/failed' });
      }
    });
  }, [done, nextCursor, once, dispatch]);

  useEffect(() => {
    if (status === 'idle') loadMore();
  }, [status, loadMore]);

  const blogs = useMemo(
    () => feed.ids.map((id) => state.blogs[id]).filter(isDefined),
    [feed.ids, state.blogs],
  );

  const markHighlightSeen = useCallback(() => {
    dispatch({ type: 'blog/highlightSeen' });
  }, [dispatch]);

  return {
    blogs,
    status,
    hasMore: !done,
    justPublishedId: state.justPublishedId,
    loadMore,
    markHighlightSeen,
  };
}

export function useCreateBlog(): (input: NewBlogInput) => Promise<Blog> {
  const { dispatch } = useBlogsStore();
  return useCallback(
    async (input) => {
      const blog = await blogsApi.createBlog(input);
      dispatch({ type: 'blog/created', blog });
      return blog;
    },
    [dispatch],
  );
}

/** Moderators: removes a discussion blog. Rejects on failure. */
export function useDeleteBlog(): (id: string) => Promise<void> {
  const { dispatch } = useBlogsStore();
  return useCallback(
    async (id) => {
      await blogsApi.deleteBlog(id);
      dispatch({ type: 'blog/removed', id });
    },
    [dispatch],
  );
}

/* --------------------------------------------------------------- one blog */

export interface ItemResult<T> {
  data: T | undefined;
  status: ItemStatus;
  retry: () => void;
}

export function useBlog(id: string): ItemResult<Blog> {
  const { state, dispatch, once } = useBlogsStore();
  const data = state.blogs[id];
  const stored = state.blogStatus[id];

  const load = useCallback(() => {
    once(`blog:${id}`, async () => {
      dispatch({ type: 'blog/request', id });
      try {
        const blog = await blogsApi.getBlog(id);
        dispatch(blog ? { type: 'blog/received', blog } : { type: 'blog/missing', id });
      } catch {
        dispatch({ type: 'blog/failed', id });
      }
    });
  }, [id, once, dispatch]);

  // Feed items carry no body (and set no status), so a blog seen only in the
  // feed is fetched in full when opened.
  const complete = data && data.body !== null ? data : undefined;
  useEffect(() => {
    if (!complete && stored === undefined) load();
  }, [complete, stored, load]);

  return { data: complete, status: complete ? 'ready' : (stored ?? 'loading'), retry: load };
}

/* ----------------------------------------------------------------- threads */

export interface ThreadResult {
  comments: Comment[];
  status: LoadStatus;
  retry: () => void;
  /** Posts as the signed-in member. Rejects on failure so the composer can say so. */
  post: (parentId: string | null, body: string) => Promise<Comment>;
  /** Moderators: marks a comment removed. Rejects on failure. */
  remove: (commentId: string) => Promise<void>;
}

const NO_COMMENTS: Comment[] = [];

export function useThread(subject: CommentSubject): ThreadResult {
  const { state, dispatch, once } = useBlogsStore();
  const key = subjectKey(subject);
  const thread = state.threads[key];

  // `subject` is usually a fresh object each render; the key is its identity.
  const stableSubject = useMemo(() => subjectFromKey(key), [key]);

  const load = useCallback(() => {
    once(`thread:${key}`, async () => {
      dispatch({ type: 'thread/request', key });
      try {
        const comments = await blogsApi.listComments(stableSubject);
        dispatch({ type: 'thread/received', key, comments });
      } catch {
        dispatch({ type: 'thread/failed', key });
      }
    });
  }, [key, stableSubject, once, dispatch]);

  useEffect(() => {
    if (!thread) load();
  }, [thread, load]);

  const post = useCallback(
    async (parentId: string | null, body: string) => {
      const comment = await blogsApi.createComment({ subject: stableSubject, parentId, body });
      dispatch({ type: 'comment/created', comment });
      return comment;
    },
    [stableSubject, dispatch],
  );

  const remove = useCallback(
    async (commentId: string) => {
      await blogsApi.deleteComment(stableSubject, commentId);
      dispatch({ type: 'comment/removed', subject: stableSubject, commentId });
    },
    [stableSubject, dispatch],
  );

  return {
    comments: thread?.comments ?? NO_COMMENTS,
    status: thread?.status ?? 'loading',
    retry: load,
    post,
    remove,
  };
}

/* ------------------------------------------------------------ query blogs */

export interface QueryBlogsResult {
  queryBlogs: QueryBlog[];
  status: LoadStatus;
  retry: () => void;
}

export function useQueryBlogs(): QueryBlogsResult {
  const { state, dispatch, once } = useBlogsStore();
  const { queryListStatus, queryOrder } = state;

  const load = useCallback(() => {
    once('queries', async () => {
      dispatch({ type: 'queries/request' });
      try {
        dispatch({ type: 'queries/received', queryBlogs: await blogsApi.listQueryBlogs() });
      } catch {
        dispatch({ type: 'queries/failed' });
      }
    });
  }, [once, dispatch]);

  useEffect(() => {
    if (queryListStatus === 'idle') load();
  }, [queryListStatus, load]);

  const queryBlogs = useMemo(
    () => queryOrder.map((id) => state.queryBlogs[id]).filter(isDefined),
    [queryOrder, state.queryBlogs],
  );

  return { queryBlogs, status: queryListStatus, retry: load };
}

export function useQueryBlog(id: string): ItemResult<QueryBlog> {
  const { state, dispatch, once } = useBlogsStore();
  const data = state.queryBlogs[id];
  const stored = state.queryStatus[id];

  const load = useCallback(() => {
    once(`query:${id}`, async () => {
      dispatch({ type: 'query/request', id });
      try {
        const queryBlog = await blogsApi.getQueryBlog(id);
        dispatch(queryBlog ? { type: 'query/received', queryBlog } : { type: 'query/missing', id });
      } catch {
        dispatch({ type: 'query/failed', id });
      }
    });
  }, [id, once, dispatch]);

  useEffect(() => {
    if (!data && stored === undefined) load();
  }, [data, stored, load]);

  return { data, status: data ? 'ready' : (stored ?? 'loading'), retry: load };
}

/** Ambassadors (own categories) and admins. Rejects on failure, e.g. 409 if the category has one. */
export function useCreateQueryBlog(): (input: NewQueryBlogInput) => Promise<QueryBlog> {
  const { dispatch } = useBlogsStore();
  return useCallback(
    async (input) => {
      const queryBlog = await blogsApi.createQueryBlog(input);
      dispatch({ type: 'query/created', queryBlog });
      return queryBlog;
    },
    [dispatch],
  );
}

/** Moderators: removes a Query Blog (its category can then get a new one). */
export function useDeleteQueryBlog(): (id: string) => Promise<void> {
  const { dispatch } = useBlogsStore();
  return useCallback(
    async (id) => {
      await blogsApi.deleteBlog(id);
      dispatch({ type: 'query/removed', id });
    },
    [dispatch],
  );
}
