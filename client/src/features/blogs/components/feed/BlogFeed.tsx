import { useEffect, useRef, type ReactNode } from 'react';

import { Button } from '../../../../components/ui/Button';
import { plural } from '../../lib/text';
import { useFeed } from '../../state/hooks';
import { StateMessage } from '../shared/StateMessage';
import { BlogCard, BlogCardSkeleton } from './BlogCard';

/** Start fetching the next page well before the user reaches the end. */
const PREFETCH_MARGIN = '0px 0px 600px 0px';

interface BlogFeedProps {
  /** Offered in the empty state, e.g. a "Write a blog" button. */
  emptyAction?: ReactNode;
}

/**
 * Newest-first feed with infinite scroll. An IntersectionObserver on a
 * sentinel below the list loads the next page; skeletons stand in while it
 * loads, exactly as they would against a real API.
 */
export function BlogFeed({ emptyAction }: BlogFeedProps) {
  const { blogs, status, hasMore, loadMore, justPublishedId, markHighlightSeen } = useFeed();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loading = status === 'loading' || status === 'idle';
  const canAutoLoad = hasMore && status === 'ready';

  // Re-observe after every page: if the sentinel is still on screen (a short
  // page, or a tall viewport), the fresh observer fires again immediately.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !canAutoLoad) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: PREFETCH_MARGIN },
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [canAutoLoad, loadMore, blogs.length]);

  if (status === 'ready' && blogs.length === 0) {
    return (
      <StateMessage title="No blogs yet" action={emptyAction}>
        Be the first to share a story, a lesson or a piece of advice with the community.
      </StateMessage>
    );
  }

  return (
    <div>
      <ul aria-busy={loading} aria-label="Blogs, newest first" className="flex flex-col gap-4">
        {blogs.map((blog) => (
          <li key={blog.id}>
            <BlogCard
              blog={blog}
              highlight={blog.id === justPublishedId}
              onHighlightDone={markHighlightSeen}
            />
          </li>
        ))}
      </ul>

      {loading && (
        <div className="mt-4 flex flex-col gap-4">
          <BlogCardSkeleton />
          {blogs.length === 0 && <BlogCardSkeleton />}
        </div>
      )}

      <div ref={sentinelRef} aria-hidden="true" className="h-px" />

      {status === 'error' && (
        <StateMessage
          role="alert"
          title="Couldn’t load more blogs"
          className="mt-4"
          action={
            <Button variant="outline" onClick={loadMore}>
              Try again
            </Button>
          }
        >
          Check your connection and try again.
        </StateMessage>
      )}

      {status === 'ready' && !hasMore && blogs.length > 0 && (
        <p className="mt-10 flex items-center justify-center gap-4 text-xs tracking-caps text-text-muted uppercase">
          <span aria-hidden="true" className="h-px w-10 bg-accent-soft" />
          You’re all caught up
          <span aria-hidden="true" className="h-px w-10 bg-accent-2-soft" />
        </p>
      )}

      {/* Polite progress announcements for screen-reader users. */}
      <p role="status" className="sr-only">
        {loading
          ? 'Loading blogs…'
          : `Showing ${plural(blogs.length, 'blog', 'blogs')}${hasMore ? '. Scroll for more.' : '.'}`}
      </p>
    </div>
  );
}
