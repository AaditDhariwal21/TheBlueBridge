import { createContext, type Dispatch } from 'react';

import { subjectKey, type SubjectKey } from '../lib/subject';
import type { Blog, Comment, Page, QueryBlog } from '../model/types';

/**
 * Client-side cache for the Blogs feature: what has been fetched or created
 * this session. The API layer owns the data; this only remembers responses
 * so navigating between pages is instant and in-session posts appear at once.
 */

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';
/** For single resources fetched by id or slug. */
export type ItemStatus = 'loading' | 'ready' | 'missing' | 'error';

export interface FeedState {
  ids: string[];
  nextCursor: string | null;
  status: LoadStatus;
  /** True once the API reports no further pages. */
  done: boolean;
}

export interface ThreadState {
  status: LoadStatus;
  comments: Comment[];
}

export interface BlogsState {
  blogs: Partial<Record<string, Blog>>;
  blogStatus: Partial<Record<string, ItemStatus>>;
  feed: FeedState;
  threads: Partial<Record<SubjectKey, ThreadState>>;
  queryBlogs: Partial<Record<string, QueryBlog>>;
  queryOrder: string[];
  queryListStatus: LoadStatus;
  queryStatus: Partial<Record<string, ItemStatus>>;
  /** The blog this session just published, so the feed can highlight it. */
  justPublishedId: string | null;
}

export type BlogsAction =
  | { type: 'feed/request' }
  | { type: 'feed/received'; page: Page<Blog> }
  | { type: 'feed/failed' }
  | { type: 'blog/request'; id: string }
  | { type: 'blog/received'; blog: Blog }
  | { type: 'blog/missing'; id: string }
  | { type: 'blog/failed'; id: string }
  | { type: 'blog/created'; blog: Blog }
  | { type: 'blog/highlightSeen' }
  | { type: 'thread/request'; key: SubjectKey }
  | { type: 'thread/received'; key: SubjectKey; comments: Comment[] }
  | { type: 'thread/failed'; key: SubjectKey }
  | { type: 'comment/created'; comment: Comment }
  | { type: 'queries/request' }
  | { type: 'queries/received'; queryBlogs: QueryBlog[] }
  | { type: 'queries/failed' }
  | { type: 'query/request'; slug: string }
  | { type: 'query/received'; queryBlog: QueryBlog }
  | { type: 'query/missing'; slug: string }
  | { type: 'query/failed'; slug: string };

export const initialBlogsState: BlogsState = {
  blogs: {},
  blogStatus: {},
  feed: { ids: [], nextCursor: null, status: 'idle', done: false },
  threads: {},
  queryBlogs: {},
  queryOrder: [],
  queryListStatus: 'idle',
  queryStatus: {},
  justPublishedId: null,
};

export function blogsReducer(state: BlogsState, action: BlogsAction): BlogsState {
  switch (action.type) {
    case 'feed/request':
      return { ...state, feed: { ...state.feed, status: 'loading' } };

    case 'feed/received': {
      const { items, nextCursor } = action.page;
      const blogs = { ...state.blogs };
      const blogStatus = { ...state.blogStatus };
      for (const blog of items) {
        blogs[blog.id] = blog;
        blogStatus[blog.id] = 'ready';
      }
      const seen = new Set(state.feed.ids);
      const ids = [...state.feed.ids, ...items.map((b) => b.id).filter((id) => !seen.has(id))];
      return {
        ...state,
        blogs,
        blogStatus,
        feed: { ids, nextCursor, status: 'ready', done: nextCursor === null },
      };
    }

    case 'feed/failed':
      return { ...state, feed: { ...state.feed, status: 'error' } };

    case 'blog/request':
      return { ...state, blogStatus: { ...state.blogStatus, [action.id]: 'loading' } };

    case 'blog/received':
      return {
        ...state,
        blogs: { ...state.blogs, [action.blog.id]: action.blog },
        blogStatus: { ...state.blogStatus, [action.blog.id]: 'ready' },
      };

    case 'blog/missing':
      return { ...state, blogStatus: { ...state.blogStatus, [action.id]: 'missing' } };

    case 'blog/failed':
      return { ...state, blogStatus: { ...state.blogStatus, [action.id]: 'error' } };

    case 'blog/created': {
      const { blog } = action;
      return {
        ...state,
        blogs: { ...state.blogs, [blog.id]: blog },
        blogStatus: { ...state.blogStatus, [blog.id]: 'ready' },
        feed: { ...state.feed, ids: [blog.id, ...state.feed.ids.filter((id) => id !== blog.id)] },
        threads: { ...state.threads, [`blog:${blog.id}`]: { status: 'ready', comments: [] } },
        justPublishedId: blog.id,
      };
    }

    case 'blog/highlightSeen':
      return state.justPublishedId ? { ...state, justPublishedId: null } : state;

    case 'thread/request':
      return {
        ...state,
        threads: {
          ...state.threads,
          [action.key]: { comments: state.threads[action.key]?.comments ?? [], status: 'loading' },
        },
      };

    case 'thread/received':
      return {
        ...state,
        threads: { ...state.threads, [action.key]: { status: 'ready', comments: action.comments } },
      };

    case 'thread/failed':
      return {
        ...state,
        threads: {
          ...state.threads,
          [action.key]: { comments: state.threads[action.key]?.comments ?? [], status: 'error' },
        },
      };

    case 'comment/created':
      return applyNewComment(state, action.comment);

    case 'queries/request':
      return { ...state, queryListStatus: 'loading' };

    case 'queries/received': {
      const queryBlogs = { ...state.queryBlogs };
      const queryStatus = { ...state.queryStatus };
      for (const q of action.queryBlogs) {
        queryBlogs[q.slug] = q;
        queryStatus[q.slug] = 'ready';
      }
      return {
        ...state,
        queryBlogs,
        queryStatus,
        queryOrder: action.queryBlogs.map((q) => q.slug),
        queryListStatus: 'ready',
      };
    }

    case 'queries/failed':
      return { ...state, queryListStatus: 'error' };

    case 'query/request':
      return { ...state, queryStatus: { ...state.queryStatus, [action.slug]: 'loading' } };

    case 'query/received':
      return {
        ...state,
        queryBlogs: { ...state.queryBlogs, [action.queryBlog.slug]: action.queryBlog },
        queryStatus: { ...state.queryStatus, [action.queryBlog.slug]: 'ready' },
      };

    case 'query/missing':
      return { ...state, queryStatus: { ...state.queryStatus, [action.slug]: 'missing' } };

    case 'query/failed':
      return { ...state, queryStatus: { ...state.queryStatus, [action.slug]: 'error' } };
  }
}

/** Adds a posted comment to its thread and bumps the counts shown elsewhere. */
function applyNewComment(state: BlogsState, comment: Comment): BlogsState {
  const key = subjectKey(comment.subject);
  const current = state.threads[key];
  const next: BlogsState = {
    ...state,
    threads: {
      ...state.threads,
      [key]: {
        status: current?.status ?? 'ready',
        comments: [...(current?.comments ?? []), comment],
      },
    },
  };

  if (comment.subject.kind === 'blog') {
    const blog = state.blogs[comment.subject.blogId];
    if (blog) {
      next.blogs = { ...state.blogs, [blog.id]: { ...blog, commentCount: blog.commentCount + 1 } };
    }
  } else {
    const topic = state.queryBlogs[comment.subject.topicSlug];
    if (topic) {
      next.queryBlogs = {
        ...state.queryBlogs,
        [topic.slug]: {
          ...topic,
          queryCount: topic.queryCount + (comment.parentId === null ? 1 : 0),
          lastActivityAt: comment.createdAt,
        },
      };
    }
  }
  return next;
}

export interface BlogsStore {
  state: BlogsState;
  dispatch: Dispatch<BlogsAction>;
  /**
   * Runs `task` unless one with the same key is already in flight. Dedupes
   * requests fired twice (StrictMode effects, observer + click, etc.).
   */
  once: (key: string, task: () => Promise<void>) => void;
}

export const BlogsContext = createContext<BlogsStore | null>(null);
