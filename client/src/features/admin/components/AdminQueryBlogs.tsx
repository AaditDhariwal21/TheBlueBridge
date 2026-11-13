import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Button } from '../../../components/ui/Button';
import { CategoryDot } from '../../../components/ui/CategoryDot';
import { Skeleton } from '../../../components/ui/Skeleton';
import { StateMessage } from '../../../components/ui/StateMessage';
import { useToast } from '../../../components/ui/toast';
import { QueryBlogComposer } from '../../blogs/components/query/QueryBlogComposer';
import { RelativeTime } from '../../blogs/components/shared/RelativeTime';
import { queryBlogPath } from '../../blogs/lib/paths';
import { plural } from '../../blogs/lib/text';
import type { QueryBlog } from '../../blogs/model/types';
import { useQueryBlogs } from '../../blogs/state/hooks';
import { useCategories } from '../../categories/useCategories';
import { RemoveQueryBlogDialog } from './RemoveQueryBlogDialog';

/**
 * Query Blogs, one per category: start one for a category that has none, or remove one.
 * Uses the Blogs section's cache, so the change shows there at once too.
 */
export function AdminQueryBlogs() {
  const { queryBlogs, status, retry } = useQueryBlogs();
  const categories = useCategories();
  const toast = useToast();
  const navigate = useNavigate();
  const [composerOpen, setComposerOpen] = useState(false);
  const [removing, setRemoving] = useState<QueryBlog | null>(null);

  const free = useMemo(() => {
    if (categories.status !== 'ready' || status !== 'ready') return null;
    const taken = new Set(queryBlogs.map((q) => q.category.id));
    return categories.categories.filter((category) => !taken.has(category.id));
  }, [categories, queryBlogs, status]);

  return (
    <section aria-labelledby="admin-query-blogs-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="admin-query-blogs-title" className="text-h2">
            Query Blogs
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            One per category. Any member asks; the category’s ambassadors answer.
          </p>
        </div>
        {free !== null && free.length > 0 && (
          <Button
            onClick={() => {
              setComposerOpen(true);
            }}
            aria-haspopup="dialog"
          >
            Start a Query Blog
          </Button>
        )}
      </div>
      {free !== null && free.length === 0 && queryBlogs.length > 0 && (
        <p className="mt-3 text-sm text-text-muted">
          Every category has a Query Blog. Remove one to start another in its category.
        </p>
      )}

      <div className="mt-6" aria-busy={status === 'loading' || undefined}>
        {status === 'error' ? (
          <StateMessage
            role="alert"
            headingLevel="h3"
            title="Query Blogs didn’t load"
            action={
              <Button variant="outline" onClick={retry}>
                Try again
              </Button>
            }
          >
            Check your connection and try again.
          </StateMessage>
        ) : status === 'ready' && queryBlogs.length === 0 ? (
          <StateMessage headingLevel="h3" title="No Query Blogs yet">
            Start one for a category and its ambassadors can begin answering.
          </StateMessage>
        ) : queryBlogs.length === 0 ? (
          <div className="flex flex-col gap-3">
            <span className="sr-only">Loading Query Blogs…</span>
            {[0, 1, 2].map((i) => (
              <div key={i} className="border border-border bg-surface p-4">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="mt-3 h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {queryBlogs.map((queryBlog) => (
              <li
                key={queryBlog.id}
                className="flex flex-col gap-3 border border-border bg-surface p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs tracking-caps text-text-muted uppercase">
                    <CategoryDot color={queryBlog.category.color} />
                    {queryBlog.category.name}
                  </p>
                  <h3 className="mt-1 font-display text-h3 wrap-break-word">
                    <Link
                      to={queryBlogPath(queryBlog.id)}
                      className="decoration-accent-soft underline-offset-4 hover:underline"
                    >
                      {queryBlog.title}
                    </Link>
                  </h3>
                  <p className="mt-1 text-sm text-text-muted">{queryBlog.description}</p>
                  <p className="mt-2 text-xs text-text-muted">
                    {plural(queryBlog.queryCount, 'query', 'queries')} · active{' '}
                    <RelativeTime iso={queryBlog.lastActivityAt} />
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRemoving(queryBlog);
                  }}
                  aria-haspopup="dialog"
                  className="shrink-0 self-start"
                >
                  Remove
                  <span className="sr-only"> {queryBlog.title}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <QueryBlogComposer
        open={composerOpen}
        categories={free ?? []}
        onClose={() => {
          setComposerOpen(false);
        }}
        onCreated={(queryBlog) => {
          setComposerOpen(false);
          toast.success(`“${queryBlog.title}” is live.`, {
            action: {
              label: 'Open it',
              onClick: () => void navigate(queryBlogPath(queryBlog.id)),
            },
          });
        }}
      />
      <RemoveQueryBlogDialog
        queryBlog={removing}
        onClose={() => {
          setRemoving(null);
        }}
      />
    </section>
  );
}
