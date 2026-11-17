import { Link } from 'react-router';

import { CategoryDot } from '../../../../components/ui/CategoryDot';
import { CATEGORY_BG } from '../../../../lib/categoryColor';
import { cn } from '../../../../lib/cn';
import { queryBlogPath } from '../../lib/paths';
import { plural } from '../../lib/text';
import type { QueryBlog } from '../../model/types';
import { ArrowRightIcon, CommentIcon } from '../shared/Icons';
import { RelativeTime } from '../shared/RelativeTime';

interface QueryBlogCardProps {
  queryBlog: QueryBlog;
  active?: boolean;
  headingLevel?: 'h2' | 'h3';
}

/**
 * A pinned topic. The whole card is clickable through a stretched link on the
 * title, so the link's accessible name stays short ("Finance"). The one being
 * read is marked: a navy border and its category's rule.
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
        'group relative cursor-pointer border bg-surface p-4 transition-colors duration-(--duration-base)',
        'hover:border-accent-soft active:bg-bg',
        'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus',
        active ? 'border-primary' : 'border-border',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 -left-px w-0.5 origin-top transition-transform duration-(--duration-base)',
          CATEGORY_BG[color],
          active ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100',
        )}
      />
      <p className="flex min-w-0 items-center gap-2 text-xs text-text-muted">
        <CategoryDot color={color} />
        <span className="truncate">{queryBlog.category.name}</span>
        {active && <span className="ml-auto shrink-0 text-xs font-medium text-text">Viewing</span>}
      </p>
      <div className="mt-1.5 flex items-start justify-between gap-3">
        <Heading className="min-w-0 font-display text-lg leading-snug wrap-break-word">
          <Link
            to={queryBlogPath(queryBlog.id)}
            aria-current={active ? 'page' : undefined}
            className="decoration-accent-soft underline-offset-4 outline-none group-hover:underline after:absolute after:inset-0"
          >
            {queryBlog.title}
          </Link>
        </Heading>
        <ArrowRightIcon className="mt-1 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-text-muted">{queryBlog.description}</p>
      <p className="mt-3 flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
        <span className="inline-flex items-center gap-1.5 font-medium text-text">
          <CommentIcon />
          {plural(queryBlog.queryCount, 'query', 'queries')}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          active <RelativeTime iso={queryBlog.lastActivityAt} />
        </span>
      </p>
    </article>
  );
}
