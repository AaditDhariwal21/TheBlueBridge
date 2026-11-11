import { useEffect, type ReactNode } from 'react';

import { preloadRoute } from '../../../../app/routes';
import { Container } from '../../../../components/layout/Container';
import { cn } from '../../../../lib/cn';
import { BLOGS_PATH, blogPath, queryBlogPath } from '../../lib/paths';
import { QueryBlogPanel } from '../query/QueryBlogPanel';

interface BlogsLayoutProps {
  children: ReactNode;
  /** Highlights this Query Blog in the side panel. */
  activeQueryBlogId?: string;
  className?: string;
}

/**
 * The Blogs section's frame. On large screens: content (70%) beside a sticky
 * Query Blogs panel (30%), on every Blogs page, as X keeps its side column.
 * Below `lg` the panel is not rendered; the feed page offers it as a tab instead.
 */
export function BlogsLayout({ children, activeQueryBlogId, className }: BlogsLayoutProps) {
  // Warm the other Blogs pages' chunks, so following a card never shows a blank fallback.
  useEffect(() => {
    preloadRoute(BLOGS_PATH);
    preloadRoute(blogPath('preload'));
    preloadRoute(queryBlogPath('preload'));
  }, []);

  return (
    <Container
      className={cn('pt-4 pb-16 sm:pt-6 lg:grid lg:grid-cols-10 lg:gap-10 lg:pb-24', className)}
    >
      <div className="min-w-0 lg:col-span-7">{children}</div>
      <aside aria-labelledby="query-panel-title" className="hidden lg:col-span-3 lg:block">
        <div className="sticky top-header max-h-[calc(100dvh-var(--spacing-header))] overflow-y-auto overscroll-contain pt-6 pb-8">
          <QueryBlogPanel activeId={activeQueryBlogId} />
        </div>
      </aside>
    </Container>
  );
}
