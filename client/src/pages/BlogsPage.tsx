import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import { useToast } from '../components/ui/toast';
import { BlogComposer } from '../features/blogs/components/composer/BlogComposer';
import { WriteBlogEntry } from '../features/blogs/components/composer/WriteBlogButtons';
import { BlogFeed } from '../features/blogs/components/feed/BlogFeed';
import { SegmentedTabs } from '../features/blogs/components/feed/SegmentedTabs';
import { panelId, tabId } from '../features/blogs/components/feed/tabIds';
import { QueryBlogPanel } from '../features/blogs/components/query/QueryBlogPanel';
import { BlogsLayout } from '../features/blogs/components/shared/BlogsLayout';
import { HowBlogsWork } from '../features/blogs/components/shared/HowBlogsWork';
import type { BlogsTab } from '../features/blogs/lib/paths';
import { MEDIA, useMediaQuery } from '../lib/useMediaQuery';

const TABS = [
  { id: 'feed', label: 'Feed' },
  { id: 'queries', label: 'Query Blogs' },
] as const satisfies readonly { id: BlogsTab; label: string }[];

const TAB_PREFIX = 'blogs';

/**
 * Scroll position per mobile tab, kept for the session and swapped on tab change.
 * (Back/forward positions are restored for every page by RootLayout.)
 */
const scrollByTab = new Map<BlogsTab, number>();

export function BlogsPage() {
  const isDesktop = useMediaQuery(MEDIA.lg);
  const [params, setParams] = useSearchParams();
  // The tab lives in the URL, so "back" from a blog returns to the same tab.
  const tab: BlogsTab = params.get('tab') === 'queries' ? 'queries' : 'feed';
  const [composerOpen, setComposerOpen] = useState(false);
  const toast = useToast();

  const previousTab = useRef(tab);
  useEffect(() => {
    if (previousTab.current === tab) return;
    previousTab.current = tab;
    window.scrollTo({ top: scrollByTab.get(tab) ?? 0, behavior: 'instant' });
  }, [tab]);

  const selectTab = (next: BlogsTab) => {
    if (next === tab) return;
    scrollByTab.set(tab, window.scrollY);
    setParams(next === 'feed' ? {} : { tab: next }, { replace: true });
  };

  const openComposer = () => {
    setComposerOpen(true);
  };
  const write = (variant: 'pill' | 'fab') => (
    <WriteBlogEntry variant={variant} onWrite={openComposer} composerOpen={composerOpen} />
  );

  return (
    <BlogsLayout
      header={
        // One slim line, so the first blog sits high on the screen. The side columns start
        // below it, level with the search row.
        <header className="flex min-w-0 flex-wrap items-baseline gap-x-4 pt-2 pb-3 lg:pt-6 lg:pb-5">
          <h1
            id="page-title"
            className="shrink-0 font-display text-page-title font-semibold text-primary motion-safe:animate-rise"
          >
            Blogs
          </h1>
          <p className="hidden min-w-0 text-sm text-text-muted sm:block">
            Stories, lessons and advice from the women of Jodhpur.
          </p>
        </header>
      }
    >
      {isDesktop ? (
        <BlogFeed writeAction={write('pill')} emptyAction={write('pill')} />
      ) : (
        <>
          <div className="sticky top-header z-30 -mx-gutter border-b border-border bg-bg px-gutter py-2">
            <SegmentedTabs
              tabs={TABS}
              value={tab}
              onChange={selectTab}
              label="Blogs sections"
              idPrefix={TAB_PREFIX}
            />
          </div>

          <div
            role="tabpanel"
            id={panelId(TAB_PREFIX, 'feed')}
            aria-labelledby={tabId(TAB_PREFIX, 'feed')}
            hidden={tab !== 'feed'}
            className="pt-4 pb-24"
          >
            <BlogFeed emptyAction={write('pill')} />
          </div>

          <div
            role="tabpanel"
            id={panelId(TAB_PREFIX, 'queries')}
            aria-labelledby={tabId(TAB_PREFIX, 'queries')}
            hidden={tab !== 'queries'}
            className="pt-4"
          >
            <div className="flex flex-col gap-4">
              <QueryBlogPanel />
              <HowBlogsWork />
            </div>
          </div>

          {tab === 'feed' && write('fab')}
        </>
      )}

      <BlogComposer
        open={composerOpen}
        onClose={() => {
          setComposerOpen(false);
        }}
        onPublished={() => {
          setComposerOpen(false);
          toast.success('Your blog is published.');
          // The new row animates in, takes focus and scrolls into view.
        }}
      />
    </BlogsLayout>
  );
}
