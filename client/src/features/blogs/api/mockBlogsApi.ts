import { SEED_BLOGS } from '../data/blogs';
import { SEED_BLOG_COMMENTS } from '../data/blogComments';
import { SEED_QUERY_BLOGS, SEED_QUERY_THREADS } from '../data/queryBlogs';
import type { SeedComment } from '../data/threadBuilder';
import { USERS } from '../data/users';
import { subjectKey, type SubjectKey } from '../lib/subject';
import { estimateReadTime, slugify } from '../lib/text';
import type { Blog, Comment, CommentSubject, QueryBlog, User } from '../model/types';
import { BlogsApiError, type BlogsApi } from './contract';

/**
 * MOCK: an in-memory stand-in for the Blogs API. It plays the server's part:
 * it owns the data, assigns ids and timestamps, keeps counts consistent and
 * attaches the session user to new posts. Everything resets on reload.
 */

const SESSION_USER: User = USERS.current;

/* ------------------------------------------------------------ the "database" */

function toComments(subject: CommentSubject, seed: SeedComment[]): Comment[] {
  return seed.map((c) => ({
    id: c.id,
    subject,
    parentId: c.parentId,
    author: USERS[c.author],
    body: c.body,
    createdAt: c.createdAt,
  }));
}

const threads = new Map<SubjectKey, Comment[]>();

for (const blog of SEED_BLOGS) {
  const subject: CommentSubject = { kind: 'blog', blogId: blog.id };
  threads.set(subjectKey(subject), toComments(subject, SEED_BLOG_COMMENTS[blog.id] ?? []));
}
for (const topic of SEED_QUERY_BLOGS) {
  const subject: CommentSubject = { kind: 'query', topicSlug: topic.slug };
  threads.set(subjectKey(subject), toComments(subject, SEED_QUERY_THREADS[topic.slug] ?? []));
}

const blogs: Blog[] = SEED_BLOGS.map((seed) => ({
  id: seed.id,
  title: seed.title,
  body: seed.body,
  categoryId: seed.categoryId,
  author: USERS[seed.author],
  createdAt: seed.createdAt,
  readTimeMinutes: estimateReadTime(seed.body),
  commentCount: threads.get(`blog:${seed.id}`)?.length ?? 0,
}));

const queryBlogs: QueryBlog[] = SEED_QUERY_BLOGS.map((seed) => {
  const entries = threads.get(`query:${seed.slug}`) ?? [];
  return {
    ...seed,
    queryCount: entries.filter((c) => c.parentId === null).length,
    lastActivityAt: latest(entries.map((c) => c.createdAt)),
  };
});

/* ------------------------------------------------------------------ helpers */

function latest(isoDates: string[]): string {
  return isoDates.reduce((max, d) => (d > max ? d : max), '1970-01-01T00:00:00.000Z');
}

const newestFirst = (a: Blog, b: Blog) =>
  b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);

/** Keyset cursor (createdAt + id), so inserts at the top never shift later pages. */
function encodeCursor(blog: Blog): string {
  return `${blog.createdAt}|${blog.id}`;
}

function isAfterCursor(blog: Blog, cursor: string): boolean {
  const [createdAt = '', id = ''] = cursor.split('|');
  return blog.createdAt < createdAt || (blog.createdAt === createdAt && blog.id < id);
}

/** Simulated network latency, so loading states are real. */
function latency(min = 280, max = 650): Promise<void> {
  const ms = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Responses are copies: callers can never mutate the store by accident. */
const clone = <T>(value: T): T => structuredClone(value);

function newId(prefix: string): string {
  const random =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}${random}`;
}

/* ---------------------------------------------------------------------- API */

export const mockBlogsApi: BlogsApi = {
  async listBlogs({ cursor, limit }) {
    await latency(450, 850);
    const sorted = [...blogs].sort(newestFirst);
    const start = cursor ? sorted.filter((b) => isAfterCursor(b, cursor)) : sorted;
    const items = start.slice(0, limit);
    const last = items.at(-1);
    const hasMore = start.length > items.length;
    return clone({ items, nextCursor: hasMore && last ? encodeCursor(last) : null });
  },

  async getBlog(id) {
    await latency();
    const blog = blogs.find((b) => b.id === id);
    return blog ? clone(blog) : null;
  },

  async createBlog(input) {
    await latency(500, 900);
    const blog: Blog = {
      id: `${slugify(input.title, 48)}-${newId('').slice(0, 5)}`,
      title: input.title,
      body: input.body,
      categoryId: input.categoryId,
      author: SESSION_USER,
      createdAt: new Date().toISOString(),
      readTimeMinutes: estimateReadTime(input.body),
      commentCount: 0,
    };
    blogs.push(blog);
    threads.set(`blog:${blog.id}`, []);
    return clone(blog);
  },

  async listComments(subject) {
    await latency();
    const list = threads.get(subjectKey(subject));
    if (!list) throw new BlogsApiError('This conversation could not be found.');
    return clone(list);
  },

  async createComment({ subject, parentId, body }) {
    await latency(250, 500);
    const list = threads.get(subjectKey(subject));
    if (!list) throw new BlogsApiError('This conversation could not be found.');
    if (parentId && !list.some((c) => c.id === parentId)) {
      throw new BlogsApiError('The comment you are replying to no longer exists.');
    }

    const comment: Comment = {
      id: newId('c-'),
      subject,
      parentId,
      author: SESSION_USER,
      body,
      createdAt: new Date().toISOString(),
    };
    list.push(comment);

    // Keep denormalised counts in step, as a real backend would.
    if (subject.kind === 'blog') {
      const blog = blogs.find((b) => b.id === subject.blogId);
      if (blog) blog.commentCount += 1;
    } else {
      const topic = queryBlogs.find((q) => q.slug === subject.topicSlug);
      if (topic) {
        if (parentId === null) topic.queryCount += 1;
        topic.lastActivityAt = comment.createdAt;
      }
    }
    return clone(comment);
  },

  async listQueryBlogs() {
    await latency(250, 500);
    return clone(queryBlogs);
  },

  async getQueryBlog(slug) {
    await latency();
    const topic = queryBlogs.find((q) => q.slug === slug);
    return topic ? clone(topic) : null;
  },
};
