import { useEffect, useRef, useState } from 'react';
import { NavigationType, useNavigationType, useSearchParams } from 'react-router';

import { canWriteBlog } from '../features/auth/permissions';
import { BlogComposer } from '../features/blogs/components/composer/BlogComposer';
import {
  WriteBlogButton,
  WriteBlogFab,
} from '../features/blogs/components/composer/WriteBlogButtons';
import { BlogFeed } from '../features/blogs/components/feed/BlogFeed';
import { SegmentedTabs } from '../features/blogs/components/feed/SegmentedTabs';
import { panelId, tabId } from '../features/blogs/components/feed/tabIds';
import { QueryBlogList } from '../features/blogs/components/query/QueryBlogList';
import { BlogsLayout } from '../features/blogs/components/shared/BlogsLayout';
import { JoinPrompt } from '../features/blogs/components/shared/JoinPrompt';
import type { BlogsTab } from '../features/blogs/lib/paths';
import { useBlogActor } from '../features/blogs/state/viewer';
import { MEDIA, useMediaQuery } from '../lib/useMediaQuery';

const TABS = [
  { id: 'feed', label: 'Feed' },
  { id: 'queries', label: 'Query Blogs' },
] as const satisfies readonly { id: BlogsTab; label: string }[];

const TAB_PREFIX = 'blogs';

/**
 * Scroll position per tab, kept for the session. Saved when the user clicks
 * through to a blog or topic, restored on browser-back, and swapped on tab change.
 */
const scrollByTab = new Map<BlogsTab, number>();

export function BlogsPage() {
  const isDesktop = useMediaQuery(MEDIA.lg);
  const [params, setParams] = useSearchParams();
  // The tab lives in the URL, so "back" from a blog returns to the same tab.
  const tab: BlogsTab = params.get('tab') === 'queries' ? 'queries' : 'feed';
  const [composerOpen, setComposerOpen] = useState(false);
  const canWrite = canWriteBlog(useBlogActor());
  const navigationType = useNavigationType();

  // Back/forward into the feed: return to where the reader was.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const y = scrollByTab.get(tab);
    if (navigationType !== NavigationType.Pop || y === undefined) return;
    // After RootLayout's scroll-to-top for the new route.
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: y, behavior: 'instant' });
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [navigationType, tab]);

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

  return (
    <BlogsLayout>
      {/* Remember the position whenever the reader follows a link out of the page. */}
      <div
        onClickCapture={() => {
          scrollByTab.set(tab, window.scrollY);
        }}
      >
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 lg:pt-6">
          <div className="min-w-0">
            <p className="text-xs tracking-caps text-text-muted uppercase">From the community</p>
            <h1 id="page-title" className="mt-2 text-h1 tracking-tight motion-safe:animate-rise">
              Blogs
            </h1>
            <p className="mt-2 max-w-narrow text-text-muted">
              Stories, lessons and practical advice from the women of Jodhpur.
            </p>
          </div>
          {isDesktop &&
            (canWrite ? (
              <WriteBlogButton onClick={openComposer} composerOpen={composerOpen} />
            ) : (
              <JoinPrompt action="write a blog" variant="inline" />
            ))}
        </header>
        <div
          aria-hidden="true"
          className="mt-6 h-px w-24 bg-linear-to-r from-accent-soft to-accent-2-soft"
        />

        {isDesktop ? (
          <div className="mt-8">
            <BlogFeed
              emptyAction={
                canWrite && <WriteBlogButton onClick={openComposer} composerOpen={composerOpen} />
              }
            />
          </div>
        ) : (
          <>
            <div className="sticky top-header z-30 -mx-gutter mt-5 border-b border-border bg-bg px-gutter py-2">
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
              className="pt-4 pb-20"
            >
              <BlogFeed />
            </div>

            <div
              role="tabpanel"
              id={panelId(TAB_PREFIX, 'queries')}
              aria-labelledby={tabId(TAB_PREFIX, 'queries')}
              hidden={tab !== 'queries'}
              className="pt-4"
            >
              <p className="mb-4 text-sm text-text-muted">
                One per category. Any member asks; ambassadors answer.
              </p>
              <QueryBlogList headingLevel="h2" />
            </div>

            {tab === 'feed' && canWrite && (
              <WriteBlogFab onClick={openComposer} composerOpen={composerOpen} />
            )}
          </>
        )}
      </div>

      <BlogComposer
        open={composerOpen}
        onClose={() => {
          setComposerOpen(false);
        }}
        onPublished={() => {
          setComposerOpen(false);
          // The feed card animates in, takes focus and scrolls into view.
        }}
      />
    </BlogsLayout>
  );
}
