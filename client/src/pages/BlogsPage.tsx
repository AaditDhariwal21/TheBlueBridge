import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import { useToast } from '../components/ui/toast';
import { canWriteBlog } from '../features/auth/permissions';
import { BlogComposer } from '../features/blogs/components/composer/BlogComposer';
import {
  ComposeBar,
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
  const canWrite = canWriteBlog(useBlogActor());
  const toast = useToast();

  const previousTab = useRef(tab);
  useEffect(() => {
    if (previousTab.current === tab) return;
    previousTab.current = tab;
    window.scrollTo({ top: scrollByTab.get(tab) ?? 0, behavior: 'instant' });
  }, [tab]);

  // On phones the floating "Write a blog" appears only once the compose bar is out of view.
  const composeRef = useRef<HTMLButtonElement>(null);
  const [composeInView, setComposeInView] = useState(true);
  useEffect(() => {
    const bar = composeRef.current;
    if (!bar || isDesktop) return;
    const observer = new IntersectionObserver((entries) => {
      setComposeInView(entries.some((entry) => entry.isIntersecting));
    });
    observer.observe(bar);
    return () => {
      observer.disconnect();
    };
  }, [isDesktop, canWrite, tab]);

  const selectTab = (next: BlogsTab) => {
    if (next === tab) return;
    scrollByTab.set(tab, window.scrollY);
    setParams(next === 'feed' ? {} : { tab: next }, { replace: true });
  };

  const openComposer = () => {
    setComposerOpen(true);
  };

  const compose = canWrite ? (
    <ComposeBar ref={composeRef} onClick={openComposer} composerOpen={composerOpen} />
  ) : (
    <JoinPrompt action="write a blog" />
  );

  return (
    <BlogsLayout>
      <header className="lg:pt-6">
        <p className="text-xs tracking-caps text-text-muted uppercase">From the community</p>
        <h1 id="page-title" className="mt-2 text-h1 tracking-tight motion-safe:animate-rise">
          Blogs
        </h1>
        <p className="mt-3 max-w-reading text-lg text-text-muted">
          Stories, lessons and practical advice from the women of Jodhpur. Settle in and read, then
          share something of your own.
        </p>
        <div
          aria-hidden="true"
          className="mt-6 h-px w-24 bg-linear-to-r from-accent-soft to-accent-2-soft"
        />
      </header>

      {isDesktop ? (
        <div className="mt-8 flex flex-col gap-6">
          {compose}
          <BlogFeed
            emptyAction={
              canWrite && <WriteBlogButton onClick={openComposer} composerOpen={composerOpen} />
            }
          />
        </div>
      ) : (
        <>
          <div className="sticky top-header z-30 -mx-gutter mt-6 border-b border-border bg-bg px-gutter py-2">
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
            className="flex flex-col gap-5 pt-5 pb-20"
          >
            {compose}
            <BlogFeed
              emptyAction={
                canWrite && <WriteBlogButton onClick={openComposer} composerOpen={composerOpen} />
              }
            />
          </div>

          <div
            role="tabpanel"
            id={panelId(TAB_PREFIX, 'queries')}
            aria-labelledby={tabId(TAB_PREFIX, 'queries')}
            hidden={tab !== 'queries'}
            className="pt-5"
          >
            <h2 className="text-h3">Ask the ambassadors</h2>
            <p className="mt-1 mb-5 text-sm text-text-muted">
              One Query Blog per category. Any member can ask; its ambassadors answer.
            </p>
            <QueryBlogList />
          </div>

          {tab === 'feed' && canWrite && !composeInView && (
            <WriteBlogFab onClick={openComposer} composerOpen={composerOpen} />
          )}
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
          // The feed card animates in, takes focus and scrolls into view.
        }}
      />
    </BlogsLayout>
  );
}
