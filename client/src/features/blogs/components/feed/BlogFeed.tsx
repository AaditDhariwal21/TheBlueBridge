import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Button } from '../../../../components/ui/Button';
import { StateMessage } from '../../../../components/ui/StateMessage';
import { cn } from '../../../../lib/cn';
import { useDebouncedValue } from '../../../../lib/useDebouncedValue';
import { plural } from '../../lib/text';
import type { Blog } from '../../model/types';
import { FEED_SEARCH_RULES } from '../../model/validation';
import { useFeed, useFeedSearch } from '../../state/hooks';
import { BlogCard, BlogCardSkeleton } from './BlogCard';
import { FeedSearchBar } from './FeedSearchBar';

/** Start fetching the next page well before the user reaches the end. */
const PREFETCH_MARGIN = '0px 0px 600px 0px';

const normalise = (text: string) => text.replace(/\s+/g, ' ').trim();

interface BlogFeedProps {
  /** Offered in the empty state, e.g. a "Write a blog" button. */
  emptyAction?: ReactNode;
}

/**
 * The Feed with search and a category filter above it. Without either it is the cached,
 * newest-first feed; with them, live results. Searching waits for a pause in typing and
 * at least two characters. The search lives in this component's state, not the URL.
 */
export function BlogFeed({ emptyAction }: BlogFeedProps) {
  const [query, setQuery] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const typed = normalise(query);
  const settled = useDebouncedValue(typed, FEED_SEARCH_RULES.debounceMs);
  // Clearing the box shows the Feed at once; new words wait for the pause.
  const min = FEED_SEARCH_RULES.queryMin;
  const q = typed.length >= min && settled.length >= min ? settled : '';

  const clear = () => {
    setQuery('');
    setCategoryIds([]);
  };

  return (
    <div>
      <FeedSearchBar
        query={query}
        onQueryChange={setQuery}
        categoryIds={categoryIds}
        onCategoriesChange={setCategoryIds}
      />
      <div className="mt-5">
        {q || categoryIds.length > 0 ? (
          <SearchResults q={q} categoryIds={categoryIds} onClear={clear} />
        ) : (
          <LatestBlogs emptyAction={emptyAction} />
        )}
      </div>
    </div>
  );
}

function LatestBlogs({ emptyAction }: BlogFeedProps) {
  const { blogs, status, hasMore, loadMore, justPublishedId, markHighlightSeen } = useFeed();
  return (
    <FeedList
      label="Blogs, newest first"
      blogs={blogs}
      loading={status === 'loading' || status === 'idle'}
      failed={status === 'error'}
      hasMore={hasMore}
      loadMore={loadMore}
      retry={loadMore}
      highlightId={justPublishedId}
      onHighlightDone={markHighlightSeen}
      empty={
        <StateMessage title="No blogs yet" action={emptyAction}>
          Be the first to share a story, a lesson or a piece of advice with the community.
        </StateMessage>
      }
    />
  );
}

function SearchResults({
  q,
  categoryIds,
  onClear,
}: {
  q: string;
  categoryIds: string[];
  onClear: () => void;
}) {
  const results = useFeedSearch(q, categoryIds);
  return (
    <FeedList
      label={q ? 'Search results, most relevant first' : 'Filtered blogs, newest first'}
      blogs={results.items}
      loading={results.status === 'loading'}
      failed={results.status === 'error'}
      hasMore={results.hasMore}
      loadMore={results.loadMore}
      retry={results.retry}
      empty={
        <StateMessage
          role="status"
          title="No blogs match"
          action={
            <Button variant="outline" onClick={onClear}>
              Clear filters
            </Button>
          }
        >
          Try other words, or fewer categories.
        </StateMessage>
      }
    />
  );
}

interface FeedListProps {
  label: string;
  blogs: Blog[];
  loading: boolean;
  failed: boolean;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
  empty: ReactNode;
  highlightId?: string | null;
  onHighlightDone?: () => void;
}

/**
 * Feed cards with infinite scroll: an IntersectionObserver on a sentinel below the list
 * loads the next page, with skeletons while it loads. When new results replace old ones
 * (a new search), the old cards stay, dimmed, until they arrive, so nothing jumps.
 */
function FeedList({
  label,
  blogs,
  loading,
  failed,
  hasMore,
  loadMore,
  retry,
  empty,
  highlightId = null,
  onHighlightDone,
}: FeedListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const canAutoLoad = hasMore && !loading && !failed;
  const replacing = loading && !hasMore && blogs.length > 0;

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

  if (!loading && !failed && blogs.length === 0) return empty;

  return (
    <div>
      <ul
        aria-busy={loading}
        aria-label={label}
        className={cn(
          'flex flex-col gap-4 transition-opacity',
          replacing && 'opacity-60 motion-reduce:opacity-100',
        )}
      >
        {blogs.map((blog) => (
          <li key={blog.id}>
            <BlogCard
              blog={blog}
              highlight={blog.id === highlightId}
              {...(onHighlightDone && { onHighlightDone })}
            />
          </li>
        ))}
      </ul>

      {loading && !replacing && (
        <div className={cn('flex flex-col gap-4', blogs.length > 0 && 'mt-4')}>
          <BlogCardSkeleton />
          {blogs.length === 0 && <BlogCardSkeleton />}
        </div>
      )}

      <div ref={sentinelRef} aria-hidden="true" className="h-px" />

      {failed && (
        <StateMessage
          role="alert"
          title={blogs.length > 0 ? 'Couldn’t load more blogs' : 'Couldn’t load blogs'}
          className="mt-4"
          action={
            <Button variant="outline" onClick={retry}>
              Try again
            </Button>
          }
        >
          Check your connection and try again.
        </StateMessage>
      )}

      {!loading && !failed && !hasMore && blogs.length > 0 && (
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
