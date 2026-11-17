import { useEffect, useRef } from 'react';
import { Link } from 'react-router';

import { Skeleton } from '../../../../components/ui/Skeleton';
import { cn } from '../../../../lib/cn';
import { scrollIntoViewGently } from '../../../../lib/motion';
import { blogPath } from '../../lib/paths';
import { plural } from '../../lib/text';
import type { Blog } from '../../model/types';
import { AuthorByline } from '../shared/AuthorByline';
import { CategoryChip } from '../shared/CategoryChip';
import { ArrowRightIcon, ClockIcon, CommentIcon } from '../shared/Icons';

interface BlogCardProps {
  blog: Blog;
  /** Just published this session: animate in, take focus, and scroll into view. */
  highlight?: boolean;
  onHighlightDone?: () => void;
  /** First render of the feed: fades up after this many ms (staggered by the list). */
  enterDelay?: number;
}

/** One line of preview text, whitespace collapsed; CSS clamps it to 2-3 lines. */
const previewOf = (text: string) => text.replace(/\s+/g, ' ').trim();

/**
 * Feed card. The title is the card's only link and is stretched over the
 * whole card, so the entire surface is clickable while screen readers hear a
 * concise link name. Focus is drawn around the card, not just the title.
 */
export function BlogCard({ blog, highlight, onHighlightDone, enterDelay }: BlogCardProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);

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
        'group relative cursor-pointer border border-border bg-surface p-5 transition-[border-color,translate] duration-(--duration-base) sm:p-7',
        'hover:border-accent-soft active:translate-y-0 active:bg-bg motion-safe:hover:-translate-y-0.5',
        'has-[a:focus-visible]:border-accent-soft has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus',
        highlight
          ? 'motion-safe:animate-arrive'
          : enterDelay !== undefined && 'motion-safe:animate-fade-up',
      )}
    >
      {/* Blue→pink rule that draws in on hover/focus: the brand's bridge motif. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 -left-px w-0.5 origin-top scale-y-0 bg-linear-to-b from-accent-soft to-accent-2-soft transition-transform duration-(--duration-base) group-hover:scale-y-100 group-has-[a:focus-visible]:scale-y-100"
      />

      <AuthorByline author={blog.author} createdAt={blog.createdAt} />

      <h2
        id={`blog-${blog.id}-title`}
        className="mt-5 line-clamp-3 font-display text-title wrap-break-word text-text"
      >
        <Link
          ref={linkRef}
          to={blogPath(blog.id)}
          className="decoration-accent-soft decoration-1 underline-offset-4 outline-none group-hover:underline after:absolute after:inset-0"
        >
          {blog.title}
        </Link>
      </h2>

      <p className="mt-2.5 line-clamp-2 leading-relaxed wrap-break-word text-text-muted sm:line-clamp-3">
        {previewOf(blog.excerpt)}
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border pt-4">
        {blog.categories.length > 0 && (
          <ul aria-label="Categories" className="flex min-w-0 flex-wrap gap-2">
            {blog.categories.map((category) => (
              <li key={category.id} className="max-w-full min-w-0">
                <CategoryChip category={category} />
              </li>
            ))}
          </ul>
        )}
        <p className="ml-auto flex shrink-0 items-center gap-4 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <ClockIcon />
            {blog.readTimeMinutes} min read
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CommentIcon />
            {plural(blog.commentCount, 'comment', 'comments')}
          </span>
          <ArrowRightIcon className="hidden text-accent transition-transform duration-(--duration-base) group-hover:translate-x-1 sm:block" />
        </p>
      </div>
    </article>
  );
}

export function BlogCardSkeleton() {
  return (
    <div aria-hidden="true" className="border border-border bg-surface p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-3 w-40 max-w-full" />
          <Skeleton className="mt-2 h-2.5 w-28" />
        </div>
      </div>
      <Skeleton className="mt-6 h-5 w-4/5" />
      <Skeleton className="mt-2 h-5 w-1/2" />
      <Skeleton className="mt-4 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-3/5" />
      <div className="mt-5 flex justify-between gap-4 border-t border-border pt-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
