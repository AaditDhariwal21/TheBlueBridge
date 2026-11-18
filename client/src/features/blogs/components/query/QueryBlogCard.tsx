import { Link } from 'react-router';

import { CategoryDot } from '../../../../components/ui/CategoryDot';
import { cn } from '../../../../lib/cn';
import { queryBlogPath } from '../../lib/paths';
import { keepDashTogether, plural } from '../../lib/text';
import type { QueryBlog } from '../../model/types';
import { CommentIcon } from '../shared/Icons';

interface QueryBlogCardProps {
  queryBlog: QueryBlog;
  headingLevel?: 'h2' | 'h3';
}

/**
 * A pinned topic, as a row in the "Query Blogs" panel. The whole row is clickable
 * through a stretched link on the title, so the link's accessible name stays short. Hover
 * shades the row and draws a navy rule on its left.
 */
export function QueryBlogCard({ queryBlog, headingLevel: Heading = 'h3' }: QueryBlogCardProps) {
  const { color } = queryBlog.category;
  return (
    <article
      className={cn(
        'group relative px-6 py-4 transition-colors',
        'hover:bg-bg active:bg-border/40',
        'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-focus',
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 bg-primary transition-transform duration-(--duration-base) group-hover:scale-y-100"
      />
      <p className="flex min-w-0 items-center gap-2 text-meta text-text-muted">
        <CategoryDot color={color} />
        <span className="truncate">{queryBlog.category.name}</span>
      </p>
      <Heading className="mt-2 font-display text-lg leading-snug font-semibold text-balance wrap-break-word text-primary">
        <Link
          to={queryBlogPath(queryBlog.id)}
          className="outline-none after:absolute after:inset-0"
        >
          {keepDashTogether(queryBlog.title)}
        </Link>
      </Heading>
      <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{queryBlog.description}</p>
      <p className="mt-3 flex items-center gap-1.5 text-meta font-medium text-text">
        <CommentIcon />
        {plural(queryBlog.queryCount, 'query', 'queries')}
      </p>
    </article>
  );
}
