import { useCallback, useId, type ReactNode } from 'react';
import { Link } from 'react-router';

import { Button } from '../../../../components/ui/Button';
import { buttonClasses } from '../../../../components/ui/buttonClasses';
import { Card } from '../../../../components/ui/Card';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { cn } from '../../../../lib/cn';
import { usePagedList, type PagedList } from '../../../../lib/usePagedList';
import { blogsApi } from '../../api';
import { BLOGS_PATH, blogPath, queryBlogPath, THREAD_PARAM } from '../../lib/paths';
import { plural } from '../../lib/text';
import type { MyBlog, MyComment } from '../../model/types';
import { CategoryChip } from '../shared/CategoryChip';
import { RelativeTime } from '../shared/RelativeTime';

const PAGE_SIZE = 5;
/** On someone's profile: a glimpse first, then full pages on "Show more". */
const PROFILE_FIRST_PAGE = 2;

const fetchMyBlogs = (cursor: string | null) => blogsApi.listMyBlogs({ cursor, limit: PAGE_SIZE });
const fetchMyComments = (cursor: string | null) =>
  blogsApi.listMyComments({ cursor, limit: PAGE_SIZE });

const pathOf = (blog: { id: string; type: 'discussion' | 'query' }) =>
  blog.type === 'query' ? queryBlogPath(blog.id) : blogPath(blog.id);

/** "My blogs": the member's own blogs and Query Blogs, newest first. */
export function MyBlogs() {
  const list = usePagedList(fetchMyBlogs);
  return (
    <ActivitySection
      title="My blogs"
      list={list}
      empty={
        <>
          <p>You haven’t written a blog yet.</p>
          <Link
            to={BLOGS_PATH}
            className={buttonClasses({ variant: 'outline', className: 'mt-3' })}
          >
            Go to the blogs
          </Link>
        </>
      }
      renderItem={(blog: MyBlog) => <BlogItem key={blog.id} blog={blog} />}
    />
  );
}

/** "My comments": the member's own comments, queries and replies, newest first. */
export function MyComments() {
  const list = usePagedList(fetchMyComments);
  return (
    <ActivitySection
      title="My comments"
      list={list}
      empty={<p>You haven’t commented or asked anything yet.</p>}
      renderItem={(comment: MyComment) => <CommentItem key={comment.id} comment={comment} />}
    />
  );
}

/** A member's blogs and comments, inside their profile panel. */
export function AuthorActivity({ authorId }: { authorId: string }) {
  const fetchBlogs = useCallback(
    (cursor: string | null) =>
      blogsApi.listAuthorBlogs({
        authorId,
        cursor,
        limit: cursor === null ? PROFILE_FIRST_PAGE : PAGE_SIZE,
      }),
    [authorId],
  );
  const fetchComments = useCallback(
    (cursor: string | null) =>
      blogsApi.listAuthorComments({
        authorId,
        cursor,
        limit: cursor === null ? PROFILE_FIRST_PAGE : PAGE_SIZE,
      }),
    [authorId],
  );
  const blogs = usePagedList(fetchBlogs);
  const comments = usePagedList(fetchComments);

  return (
    <div className="flex flex-col gap-6">
      <ActivitySection
        embedded
        title="Blogs"
        list={blogs}
        empty={<p>No blogs yet.</p>}
        renderItem={(blog: MyBlog) => <BlogItem key={blog.id} blog={blog} compact />}
      />
      <ActivitySection
        embedded
        title="Comments"
        list={comments}
        empty={<p>No comments yet.</p>}
        renderItem={(comment: MyComment) => <CommentItem key={comment.id} comment={comment} />}
      />
    </div>
  );
}

function BlogItem({ blog, compact = false }: { blog: MyBlog; compact?: boolean }) {
  return (
    <li className={compact ? 'py-3' : 'py-4'}>
      <Link
        to={pathOf(blog)}
        className={cn(
          'font-display wrap-break-word decoration-accent-soft underline-offset-4 hover:underline',
          compact ? 'text-h3' : 'text-title',
        )}
      >
        {blog.title}
      </Link>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-text-muted">
        {blog.type === 'query' && (
          <span className="border border-accent/40 px-1.5 font-medium text-accent">Query Blog</span>
        )}
        {blog.categories.map((category) => (
          <CategoryChip key={category.id} category={category} />
        ))}
        <RelativeTime iso={blog.createdAt} />
        {blog.type === 'discussion' && (
          <span>{plural(blog.commentCount, 'comment', 'comments')}</span>
        )}
      </p>
    </li>
  );
}

function CommentItem({ comment }: { comment: MyComment }) {
  return (
    <li className="py-4">
      <p className="text-xs tracking-caps text-text-muted uppercase">{kindOf(comment)}</p>
      <p className="mt-1 line-clamp-3 wrap-break-word whitespace-pre-line text-text">
        {comment.body}
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
        <span>
          on{' '}
          <Link
            to={`${pathOf(comment.blog)}?${THREAD_PARAM}=${encodeURIComponent(comment.id)}`}
            className="text-accent underline-offset-2 hover:underline"
          >
            {comment.blog.title}
          </Link>
        </span>
        <span aria-hidden="true">·</span>
        <RelativeTime iso={comment.createdAt} />
      </p>
    </li>
  );
}

function kindOf(comment: MyComment): string {
  if (comment.blog.type === 'query')
    return comment.parentId === null ? 'Query' : 'Reply to a query';
  return comment.parentId === null ? 'Comment' : 'Reply';
}

interface ActivitySectionProps<T> {
  title: string;
  list: PagedList<T>;
  empty: ReactNode;
  renderItem: (item: T) => ReactNode;
  /** Inside another panel (a profile): no card of its own, a smaller heading. */
  embedded?: boolean;
}

function ActivitySection<T>({
  title,
  list,
  empty,
  renderItem,
  embedded = false,
}: ActivitySectionProps<T>) {
  const { items, status, hasMore, loadMore, retry } = list;
  const firstLoad = status === 'loading' && items.length === 0;
  const titleId = useId();
  const Heading = embedded ? 'h4' : 'h2';

  const section = (
    <section aria-labelledby={titleId} aria-busy={status === 'loading' || undefined}>
      <Heading
        id={titleId}
        className={embedded ? 'font-sans text-sm font-medium text-text' : 'text-h3'}
      >
        {title}
      </Heading>

      {firstLoad && (
        <div className="mt-4 flex flex-col gap-5">
          <span className="sr-only">Loading…</span>
          {[0, 1].map((i) => (
            <div key={i}>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {status === 'error' && (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-danger">This list couldn’t be loaded.</span>
          <Button variant="outline" onClick={retry}>
            Try again
          </Button>
        </div>
      )}

      {status === 'ready' && items.length === 0 && (
        <div className={cn('text-sm text-text-muted', embedded ? 'mt-1' : 'mt-3')}>{empty}</div>
      )}

      {items.length > 0 && (
        <ul className={cn('divide-y divide-border', embedded ? 'mt-1' : 'mt-2')}>
          {items.map(renderItem)}
        </ul>
      )}

      {hasMore && status !== 'error' && (
        <Button
          variant="outline"
          onClick={loadMore}
          aria-disabled={status === 'loading' || undefined}
          className="mt-2 w-full"
        >
          {status === 'loading' ? 'Loading…' : 'Show more'}
        </Button>
      )}
    </section>
  );

  return embedded ? section : <Card>{section}</Card>;
}
