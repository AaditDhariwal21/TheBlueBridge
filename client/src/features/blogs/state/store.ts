import { createContext, type Dispatch } from 'react';

import { subjectKey, type SubjectKey } from '../lib/subject';
import type { Blog, Comment, CommentSubject, Page, QueryBlog } from '../model/types';

/**
 * Client-side cache for the Blogs feature: what has been fetched or created
 * this session. The API owns the data; this only remembers responses so
 * navigating between pages is instant and in-session changes appear at once.
 */

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';
/** For single resources fetched by id. */
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
  | { type: 'blog/removed'; id: string }
  | { type: 'blog/highlightSeen' }
  | { type: 'thread/request'; key: SubjectKey }
  | { type: 'thread/received'; key: SubjectKey; comments: Comment[] }
  | { type: 'thread/failed'; key: SubjectKey }
  | { type: 'comment/created'; comment: Comment }
  | { type: 'comment/removed'; subject: CommentSubject; commentId: string }
  | { type: 'queries/request' }
  | { type: 'queries/received'; queryBlogs: QueryBlog[] }
  | { type: 'queries/failed' }
  | { type: 'query/request'; id: string }
  | { type: 'query/received'; queryBlog: QueryBlog }
  | { type: 'query/missing'; id: string }
  | { type: 'query/failed'; id: string }
  | { type: 'query/created'; queryBlog: QueryBlog }
  | { type: 'query/removed'; id: string };

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

/** A feed item (no body) never erases a body that was already fetched. */
function mergeBlog(existing: Blog | undefined, incoming: Blog): Blog {
  return { ...incoming, body: incoming.body ?? existing?.body ?? null };
}

export function blogsReducer(state: BlogsState, action: BlogsAction): BlogsState {
  switch (action.type) {
    case 'feed/request':
      return { ...state, feed: { ...state.feed, status: 'loading' } };

    case 'feed/received': {
      const { items, nextCursor } = action.page;
      const blogs = { ...state.blogs };
      for (const blog of items) blogs[blog.id] = mergeBlog(blogs[blog.id], blog);
      const seen = new Set(state.feed.ids);
      const ids = [...state.feed.ids, ...items.map((b) => b.id).filter((id) => !seen.has(id))];
      return {
        ...state,
        blogs,
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
        blogs: {
          ...state.blogs,
          [action.blog.id]: mergeBlog(state.blogs[action.blog.id], action.blog),
        },
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

    case 'blog/removed': {
      return {
        ...state,
        blogs: without(state.blogs, action.id),
        blogStatus: { ...state.blogStatus, [action.id]: 'missing' },
        feed: { ...state.feed, ids: state.feed.ids.filter((id) => id !== action.id) },
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
      return applyCommentCountChange(appendComment(state, action.comment), action.comment, 1);

    case 'comment/removed': {
      const key = subjectKey(action.subject);
      const thread = state.threads[key];
      const target = thread?.comments.find((c) => c.id === action.commentId);
      if (!thread || !target || target.removed) return state;
      const next: BlogsState = {
        ...state,
        threads: {
          ...state.threads,
          [key]: {
            ...thread,
            comments: thread.comments.map((c) =>
              c.id === target.id ? { ...c, removed: true, body: null } : c,
            ),
          },
        },
      };
      return applyCommentCountChange(next, target, -1);
    }

    case 'queries/request':
      return { ...state, queryListStatus: 'loading' };

    case 'queries/received': {
      const queryBlogs = { ...state.queryBlogs };
      const queryStatus = { ...state.queryStatus };
      for (const q of action.queryBlogs) {
        queryBlogs[q.id] = q;
        queryStatus[q.id] = 'ready';
      }
      return {
        ...state,
        queryBlogs,
        queryStatus,
        queryOrder: action.queryBlogs.map((q) => q.id),
        queryListStatus: 'ready',
      };
    }

    case 'queries/failed':
      return { ...state, queryListStatus: 'error' };

    case 'query/request':
      return { ...state, queryStatus: { ...state.queryStatus, [action.id]: 'loading' } };

    case 'query/received':
      return {
        ...state,
        queryBlogs: { ...state.queryBlogs, [action.queryBlog.id]: action.queryBlog },
        queryStatus: { ...state.queryStatus, [action.queryBlog.id]: 'ready' },
      };

    case 'query/missing':
      return { ...state, queryStatus: { ...state.queryStatus, [action.id]: 'missing' } };

    case 'query/failed':
      return { ...state, queryStatus: { ...state.queryStatus, [action.id]: 'error' } };

    case 'query/created': {
      const { queryBlog } = action;
      return {
        ...state,
        queryBlogs: { ...state.queryBlogs, [queryBlog.id]: queryBlog },
        queryStatus: { ...state.queryStatus, [queryBlog.id]: 'ready' },
        queryOrder: [queryBlog.id, ...state.queryOrder.filter((id) => id !== queryBlog.id)],
        threads: { ...state.threads, [`query:${queryBlog.id}`]: { status: 'ready', comments: [] } },
      };
    }

    case 'query/removed': {
      return {
        ...state,
        queryBlogs: without(state.queryBlogs, action.id),
        queryStatus: { ...state.queryStatus, [action.id]: 'missing' },
        queryOrder: state.queryOrder.filter((id) => id !== action.id),
      };
    }
  }
}

/** A copy of the record without one key. */
function without<T>(record: Partial<Record<string, T>>, key: string): Partial<Record<string, T>> {
  return Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));
}

function appendComment(state: BlogsState, comment: Comment): BlogsState {
  const key = subjectKey(comment.subject);
  const current = state.threads[key];
  return {
    ...state,
    threads: {
      ...state.threads,
      [key]: {
        status: current?.status ?? 'ready',
        comments: [...(current?.comments ?? []), comment],
      },
    },
  };
}

/** Keeps the counts shown on cards in step with a comment added (+1) or removed (-1). */
function applyCommentCountChange(state: BlogsState, comment: Comment, delta: 1 | -1): BlogsState {
  if (comment.subject.kind === 'blog') {
    const blog = state.blogs[comment.subject.blogId];
    if (!blog) return state;
    return {
      ...state,
      blogs: { ...state.blogs, [blog.id]: { ...blog, commentCount: blog.commentCount + delta } },
    };
  }
  const queryBlog = state.queryBlogs[comment.subject.queryBlogId];
  if (!queryBlog) return state;
  return {
    ...state,
    queryBlogs: {
      ...state.queryBlogs,
      [queryBlog.id]: {
        ...queryBlog,
        queryCount: queryBlog.queryCount + (comment.parentId === null ? delta : 0),
        lastActivityAt: delta > 0 ? comment.createdAt : queryBlog.lastActivityAt,
      },
    },
  };
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
