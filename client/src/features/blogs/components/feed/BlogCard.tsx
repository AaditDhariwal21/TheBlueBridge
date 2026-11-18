import { useEffect, useRef } from 'react';
import { Link } from 'react-router';

import { Avatar } from '../../../../components/ui/Avatar';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { cn } from '../../../../lib/cn';
import { scrollIntoViewGently } from '../../../../lib/motion';
import { blogPath } from '../../lib/paths';
import { keepDashTogether, plural } from '../../lib/text';
import type { Blog } from '../../model/types';
import { BlogThumb } from '../shared/BlogThumb';
import { CategoryChip } from '../shared/CategoryChip';
import { ArrowRightIcon, ClockIcon, CommentIcon } from '../shared/Icons';
import { RelativeTime } from '../shared/RelativeTime';

interface BlogCardProps {
  blog: Blog;
  /** Just published this session: animate in, take focus, and scroll into view. */
  highlight?: boolean;
  onHighlightDone?: () => void;
  /** First visit: fades up after this many ms (staggered by the list). */
  enterDelay?: number;
}

/** One line of preview text, whitespace collapsed; CSS clamps it to two lines. */
const previewOf = (text: string) => text.replace(/\s+/g, ' ').trim();

/*
 * The grid: text on the left, a quiet thumbnail on the right. Phones: a 72px square beside
 * the title (the meta line, excerpt and footer run full width). From `sm`: a 3:2 slot beside
 * the meta, title and excerpt, 112px wide, 144px from `lg`, 160px from `xl`; the footer runs
 * full width.
 */
const GRID =
  'grid grid-cols-[minmax(0,1fr)_4.5rem] gap-x-4 sm:grid-cols-[minmax(0,1fr)_7rem] sm:gap-x-6 lg:grid-cols-[minmax(0,1fr)_9rem] xl:grid-cols-[minmax(0,1fr)_10rem]';
const THUMB =
  'col-start-2 row-start-2 mt-3 size-18 sm:row-span-3 sm:row-start-1 sm:mt-0 sm:aspect-[3/2] sm:h-auto sm:w-28 sm:self-center lg:w-36 xl:w-40';
const TEXT = 'col-span-2 sm:col-span-1 sm:col-start-1';

/**
 * Feed card. The title is the card's only link and is stretched over the whole card, so the
 * entire surface is clickable while screen readers hear a concise link name. Focus is drawn
 * around the card, not just the title.
 */
export function BlogCard({ blog, highlight, onHighlightDone, enterDelay }: BlogCardProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [firstCategory, ...moreCategories] = blog.categories;

  useEffect(() => {
    if (!highlight) return;
    const link = linkRef.current;
    if (!link) return;
    link.focus({ preventScroll: true });
    const card = link.closest('article');
    if (card) scrollIntoViewGently(card, 'center');
    const done = window.setTimeout(() => onHighlightDone?.(), 1800);
    return () => {
      window.clearTimeout(done);
    };
  }, [highlight, onHighlightDone]);

  return (
    <article
      aria-labelledby={`blog-${blog.id}-title`}
      style={enterDelay !== undefined ? { animationDelay: `${enterDelay}ms` } : undefined}
      className={cn(
        GRID,
        'group relative cursor-pointer border border-border bg-surface p-4 transition-[border-color,translate] duration-(--duration-base) sm:p-6',
        'hover:border-accent-soft active:translate-y-0 motion-safe:hover:-translate-y-0.5',
        'has-[a:focus-visible]:border-accent-soft has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus',
        highlight
          ? 'motion-safe:animate-arrive'
          : enterDelay !== undefined && 'motion-safe:animate-row-in',
      )}
    >
      <p
        className={cn(
          TEXT,
          'row-start-1 flex min-w-0 items-center gap-2 text-meta text-text-muted',
        )}
      >
        <Avatar user={blog.author} size="sm" />
        <span className="max-w-[60%] shrink-0 truncate font-medium text-text">
          {blog.author.name}
        </span>
        {blog.author.profession && (
          <span className="hidden min-w-0 items-center gap-2 sm:flex">
            <span aria-hidden="true">·</span>
            <span className="truncate">{blog.author.profession}</span>
          </span>
        )}
        <span aria-hidden="true">·</span>
        <RelativeTime iso={blog.createdAt} className="shrink-0" />
      </p>

      <h2
        id={`blog-${blog.id}-title`}
        className="col-start-1 row-start-2 mt-3 line-clamp-2 self-start font-display text-row-title font-semibold text-balance wrap-break-word text-primary"
      >
        <Link
          ref={linkRef}
          to={blogPath(blog.id)}
          className="outline-none after:absolute after:inset-0"
        >
          {keepDashTogether(blog.title)}
        </Link>
      </h2>

      <BlogThumb category={firstCategory} seed={blog.id} className={THUMB} />

      <p
        className={cn(
          TEXT,
          'row-start-3 mt-2 line-clamp-2 text-excerpt wrap-break-word text-text-secondary',
        )}
      >
        {previewOf(blog.excerpt)}
      </p>

      <div className="col-span-2 row-start-4 mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {firstCategory && (
          <span className="flex min-w-0 items-center gap-2">
            <CategoryChip category={firstCategory} />
            {moreCategories.length > 0 && (
              <span
                className="shrink-0 text-meta text-text-muted"
                title={moreCategories.map((c) => c.name).join(', ')}
              >
                +{moreCategories.length}
                <span className="sr-only">
                  {' '}
                  more: {moreCategories.map((c) => c.name).join(', ')}
                </span>
              </span>
            )}
          </span>
        )}
        <p className="ml-auto flex shrink-0 items-center gap-4 text-meta text-text-muted">
          <span className="inline-flex items-center gap-1">
            <ClockIcon />
            {blog.readTimeMinutes} min read
          </span>
          <span className="inline-flex items-center gap-1">
            <CommentIcon />
            {plural(blog.commentCount, 'comment', 'comments')}
          </span>
          <ArrowRightIcon className="text-accent transition-transform duration-(--duration-base) group-hover:translate-x-1" />
        </p>
      </div>
    </article>
  );
}

export function BlogCardSkeleton() {
  return (
    <div aria-hidden="true" className={cn(GRID, 'border border-border bg-surface p-4 sm:p-6')}>
      <div className={cn(TEXT, 'row-start-1 flex items-center gap-2')}>
        <Skeleton className="size-7 shrink-0 rounded-full" />
        <Skeleton className="h-3 w-48 max-w-full" />
      </div>
      <div className="col-start-1 row-start-2 mt-3 space-y-2">
        <Skeleton className="h-5 w-11/12" />
        <Skeleton className="h-5 w-3/5" />
      </div>
      <Skeleton className={THUMB} />
      <div className={cn(TEXT, 'row-start-3 mt-3 space-y-2')}>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <div className="col-span-2 row-start-4 mt-4 flex items-center justify-between gap-4">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  );
}
