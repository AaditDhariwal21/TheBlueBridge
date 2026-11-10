import { Link } from 'react-router';

import { cn } from '../../../../lib/cn';
import { queryBlogPath } from '../../lib/paths';
import { plural } from '../../lib/text';
import type { QueryBlog } from '../../model/types';
import { ArrowRightIcon } from '../shared/Icons';
import { RelativeTime } from '../shared/RelativeTime';

interface QueryBlogCardProps {
  queryBlog: QueryBlog;
  active?: boolean;
  headingLevel?: 'h2' | 'h3';
}

/**
 * A pinned topic. The whole card is clickable through a stretched link on the
 * title, so the link's accessible name stays short ("Finance").
 */
export function QueryBlogCard({
  queryBlog,
  active,
  headingLevel: Heading = 'h3',
}: QueryBlogCardProps) {
  const rule = queryBlog.tone === 'blue' ? 'bg-accent-soft' : 'bg-accent-2-soft';
  return (
    <article
      className={cn(
        'group relative border bg-surface p-4 transition-colors',
        'hover:border-border-strong active:bg-bg',
        'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus',
        active ? 'border-border-strong' : 'border-border',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 -left-px w-0.5 origin-top transition-transform duration-(--duration-base)',
          rule,
          active ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100',
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <Heading className="font-display text-h3 wrap-break-word">
          <Link
            to={queryBlogPath(queryBlog.slug)}
            aria-current={active ? 'page' : undefined}
            className="outline-none after:absolute after:inset-0"
          >
            {queryBlog.topic}
          </Link>
        </Heading>
        <ArrowRightIcon className="mt-1.5 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-text" />
      </div>
      <p className="mt-1 text-sm text-text-muted">{queryBlog.description}</p>
      <p className="mt-3 flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
        <span className="font-medium text-text">
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
