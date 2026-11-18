import { Link } from 'react-router';

import { CategoryDot } from '../../../../components/ui/CategoryDot';
import { cn } from '../../../../lib/cn';
import { queryBlogPath } from '../../lib/paths';
import { keepDashWithNext, plural } from '../../lib/text';
import type { QueryBlog } from '../../model/types';
import { CommentIcon } from '../shared/Icons';
import { RelativeTime } from '../shared/RelativeTime';

interface QueryBlogCardProps {
  queryBlog: QueryBlog;
  active?: boolean;
  headingLevel?: 'h2' | 'h3';
}

/**
 * A pinned topic, as a row in the "Query Blogs" panel. The whole row is clickable
 * through a stretched link on the title, so the link's accessible name stays short. The one
 * being read is shaded, ruled in navy and marked "Viewing".
 */
export function QueryBlogCard({
  queryBlog,
  active,
  headingLevel: Heading = 'h3',
}: QueryBlogCardProps) {
  const { color } = queryBlog.category;
  return (
    <article
      className={cn(
        'group relative px-6 py-4 transition-colors',
        'hover:bg-bg active:bg-border/40',
        'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-focus',
        active && 'bg-bg',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-0 w-0.5 origin-top bg-primary transition-transform duration-(--duration-base)',
          active ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100',
        )}
      />
      <p className="flex min-w-0 items-center gap-2 text-meta text-text-muted">
        <CategoryDot color={color} />
        <span className="truncate">{queryBlog.category.name}</span>
        {active && (
          <span className="ml-auto shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-on-primary">
            Viewing
          </span>
        )}
      </p>
      <Heading className="mt-2 font-display text-lg leading-snug font-semibold text-balance wrap-break-word text-primary">
        <Link
          to={queryBlogPath(queryBlog.id)}
          aria-current={active ? 'page' : undefined}
          className="outline-none after:absolute after:inset-0"
        >
          {keepDashWithNext(queryBlog.title)}
        </Link>
      </Heading>
      <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{queryBlog.description}</p>
      {/* Plain prose, so it wraps cleanly in the narrow side column. */}
      <p className="mt-3 text-meta text-text-muted">
        <CommentIcon className="mr-1.5 inline-block -translate-y-px" />
        <span className="font-medium text-text">
          {plural(queryBlog.queryCount, 'query', 'queries')}
        </span>
        , active <RelativeTime iso={queryBlog.lastActivityAt} />
      </p>
    </article>
  );
}
