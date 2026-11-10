import { useCallback, useContext, useEffect, useMemo } from 'react';

import { blogsApi } from '../api';
import { subjectKey } from '../lib/subject';
import type { Blog, Comment, CommentSubject, NewBlogInput, QueryBlog } from '../model/types';
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

  useEffect(() => {
    if (!data && stored === undefined) load();
  }, [data, stored, load]);

  return { data, status: data ? 'ready' : (stored ?? 'loading'), retry: load };
}

/* ----------------------------------------------------------------- threads */

export interface ThreadResult {
  comments: Comment[];
  status: LoadStatus;
  retry: () => void;
  /** Posts as the session user. Rejects on failure so the composer can say so. */
  post: (parentId: string | null, body: string) => Promise<Comment>;
}

const NO_COMMENTS: Comment[] = [];

export function useThread(subject: CommentSubject): ThreadResult {
  const { state, dispatch, once } = useBlogsStore();
  const key = subjectKey(subject);
  const thread = state.threads[key];

  // `subject` is usually a fresh object each render; the key is its identity.
  const stableSubject = useMemo<CommentSubject>(
    () =>
      key.startsWith('blog:')
        ? { kind: 'blog', blogId: key.slice('blog:'.length) }
        : { kind: 'query', topicSlug: key.slice('query:'.length) },
    [key],
  );

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

  return {
    comments: thread?.comments ?? NO_COMMENTS,
    status: thread?.status ?? 'loading',
    retry: load,
    post,
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
    () => queryOrder.map((slug) => state.queryBlogs[slug]).filter(isDefined),
    [queryOrder, state.queryBlogs],
  );

  return { queryBlogs, status: queryListStatus, retry: load };
}

export function useQueryBlog(slug: string): ItemResult<QueryBlog> {
  const { state, dispatch, once } = useBlogsStore();
  const data = state.queryBlogs[slug];
  const stored = state.queryStatus[slug];

  const load = useCallback(() => {
    once(`query:${slug}`, async () => {
      dispatch({ type: 'query/request', slug });
      try {
        const queryBlog = await blogsApi.getQueryBlog(slug);
        dispatch(
          queryBlog ? { type: 'query/received', queryBlog } : { type: 'query/missing', slug },
        );
      } catch {
        dispatch({ type: 'query/failed', slug });
      }
    });
  }, [slug, once, dispatch]);

  useEffect(() => {
    if (!data && stored === undefined) load();
  }, [data, stored, load]);

  return { data, status: data ? 'ready' : (stored ?? 'loading'), retry: load };
}
