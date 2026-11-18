import { useEffect, type ReactNode } from 'react';

import { preloadRoute } from '../../../../app/routes';
import { Container } from '../../../../components/layout/Container';
import { cn } from '../../../../lib/cn';
import { MEDIA, useMediaQuery } from '../../../../lib/useMediaQuery';
import { BLOGS_PATH, blogPath, queryBlogPath } from '../../lib/paths';
import { QueryBlogPanel } from '../query/QueryBlogPanel';
import { HowBlogsWork } from './HowBlogsWork';

interface BlogsLayoutProps {
  /** Above the centre column only (the page heading, a back link); the side columns start below it. */
  header?: ReactNode;
  children: ReactNode;
  /** The feed: the Query Blogs panel on the right (and "How Blogs Work" under it below `xl`). */
  showQueryBlogs?: boolean;
}

/** Sticky 88px from the top (the header plus 20px); scrolls, with a thin bar, only if it must. */
const SIDE =
  'sticky top-22 flex max-h-[calc(100dvh-5.5rem)] flex-col gap-4 overflow-y-auto overscroll-contain pb-8 [scrollbar-color:var(--color-border)_transparent] [scrollbar-width:thin]';

/**
 * The Blogs section's frame, on every Blogs page.
 * - The feed (`showQueryBlogs`): from `xl` (1280px), three columns in a container wider than
 *   the navbar's (up to 1488px): "How Blogs Work" on the left, the feed in the centre (up to
 *   760px), "Query Blogs" on the right, 28px apart. The side columns are always equal, so the
 *   centre stays centred. `lg` to `xl`: inside the navbar's edges, the feed beside a 280px
 *   column with "How Blogs Work" under the Query Blogs. Below `lg`: the feed only (phones get
 *   the Query Blogs as a tab).
 * - A blog or Query Blog: from `xl`, "How Blogs Work" on the left and the page filling the
 *   rest; below `xl`, the page only.
 * The `header` takes the first grid row above the page, so the side columns begin level with
 * the first thing under it, however the header wraps. Each panel is rendered once.
 */
export function BlogsLayout({ header, children, showQueryBlogs = false }: BlogsLayoutProps) {
  const isDesktop = useMediaQuery(MEDIA.lg);
  const isWide = useMediaQuery(MEDIA.xl);
  // Warm the other Blogs pages' chunks, so following a card never shows a blank fallback.
  useEffect(() => {
    preloadRoute(BLOGS_PATH);
    preloadRoute(blogPath('preload'));
    preloadRoute(queryBlogPath('preload'));
  }, []);

  // Grid placement is ignored wherever the container isn't a grid.
  const centre = 'min-w-0 lg:col-start-1 xl:col-start-2';
  return (
    <Container
      className={cn(
        'pt-4 pb-16 lg:pb-24 xl:max-w-blogs',
        // Side columns from `xl`: 282px at 1280, 312px from about 1420px.
        showQueryBlogs
          ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:gap-x-7 xl:grid-cols-[clamp(17rem,22vw,19.5rem)_minmax(0,47.5rem)_clamp(17rem,22vw,19.5rem)] xl:justify-center'
          : 'xl:grid xl:grid-cols-[clamp(17rem,22vw,19.5rem)_minmax(0,1fr)] xl:gap-x-7',
      )}
    >
      {header && <div className={cn(centre, 'lg:row-start-1')}>{header}</div>}
      {isWide && (
        <aside aria-label="How Blogs Work" className="col-start-1 row-start-2">
          <div className={SIDE}>
            <HowBlogsWork />
          </div>
        </aside>
      )}
      <div className={cn(centre, 'lg:row-start-2')}>{children}</div>
      {showQueryBlogs && isDesktop && (
        <aside aria-label="Query Blogs" className="col-start-2 row-start-2 xl:col-start-3">
          <div className={SIDE}>
            <QueryBlogPanel />
            {!isWide && <HowBlogsWork />}
          </div>
        </aside>
      )}
    </Container>
  );
}
