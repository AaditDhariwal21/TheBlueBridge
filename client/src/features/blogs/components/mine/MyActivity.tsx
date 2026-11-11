import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Button } from '../../../../components/ui/Button';
import { buttonClasses } from '../../../../components/ui/buttonClasses';
import { Card } from '../../../../components/ui/Card';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { blogsApi } from '../../api';
import { BLOGS_PATH, blogPath, queryBlogPath, THREAD_PARAM } from '../../lib/paths';
import { plural } from '../../lib/text';
import type { MyBlog, MyComment } from '../../model/types';
import { usePagedList, type PagedList } from '../../state/usePagedList';
import { CategoryChip } from '../shared/CategoryChip';
import { RelativeTime } from '../shared/RelativeTime';

const PAGE_SIZE = 5;
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
      id="my-blogs"
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
      renderItem={(blog: MyBlog) => (
        <li key={blog.id} className="py-4">
          <Link
            to={pathOf(blog)}
            className="font-display text-title wrap-break-word decoration-accent-soft underline-offset-4 hover:underline"
          >
            {blog.title}
          </Link>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-text-muted">
            {blog.type === 'query' && (
              <span className="border border-accent/40 px-1.5 font-medium text-accent">
                Query Blog
              </span>
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
      )}
    />
  );
}

/** "My comments": the member's own comments, queries and replies, newest first. */
export function MyComments() {
  const list = usePagedList(fetchMyComments);
  return (
    <ActivitySection
      id="my-comments"
      title="My comments"
      list={list}
      empty={<p>You haven’t commented or asked anything yet.</p>}
      renderItem={(comment: MyComment) => (
        <li key={comment.id} className="py-4">
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
      )}
    />
  );
}

function kindOf(comment: MyComment): string {
  if (comment.blog.type === 'query')
    return comment.parentId === null ? 'Query' : 'Reply to a query';
  return comment.parentId === null ? 'Comment' : 'Reply';
}

interface ActivitySectionProps<T> {
  id: string;
  title: string;
  list: PagedList<T>;
  empty: ReactNode;
  renderItem: (item: T) => ReactNode;
}

function ActivitySection<T>({ id, title, list, empty, renderItem }: ActivitySectionProps<T>) {
  const { items, status, hasMore, loadMore, retry } = list;
  const firstLoad = status === 'loading' && items.length === 0;

  return (
    <Card>
      <section aria-labelledby={`${id}-title`} aria-busy={status === 'loading' || undefined}>
        <h2 id={`${id}-title`} className="text-h3">
          {title}
        </h2>

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
          <div className="mt-3 text-sm text-text-muted">{empty}</div>
        )}

        {items.length > 0 && (
          <ul className="mt-2 divide-y divide-border">{items.map(renderItem)}</ul>
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
    </Card>
  );
}
