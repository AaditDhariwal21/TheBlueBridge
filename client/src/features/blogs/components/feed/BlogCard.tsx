import { useEffect, useRef } from 'react';
import { Link } from 'react-router';

import { cn } from '../../../../lib/cn';
import { blogPath } from '../../lib/paths';
import { plural } from '../../lib/text';
import type { Blog } from '../../model/types';
import { AuthorByline } from '../shared/AuthorByline';
import { CategoryChip } from '../shared/CategoryChip';
import { ClockIcon, CommentIcon } from '../shared/Icons';

interface BlogCardProps {
  blog: Blog;
  /** Just published this session: animate in, take focus, and scroll into view. */
  highlight?: boolean;
  onHighlightDone?: () => void;
}

/** One line of preview text, whitespace collapsed; CSS clamps it to 2-3 lines. */
const previewOf = (body: string) => body.replace(/\s+/g, ' ').trim();

/**
 * Feed card. The title is the card's only link and is stretched over the
 * whole card, so the entire surface is clickable while screen readers hear a
 * concise link name. Focus is drawn around the card, not just the title.
 */
export function BlogCard({ blog, highlight, onHighlightDone }: BlogCardProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!highlight) return;
    const link = linkRef.current;
    if (!link) return;
    link.focus({ preventScroll: true });
    link.closest('article')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const done = window.setTimeout(() => onHighlightDone?.(), 1800);
    return () => {
      window.clearTimeout(done);
    };
  }, [highlight, onHighlightDone]);

  return (
    <article
      aria-labelledby={`blog-${blog.id}-title`}
      className={cn(
        'group relative border border-border bg-surface p-5 transition-colors sm:p-6',
        'hover:border-border-strong active:bg-bg',
        'has-[a:focus-visible]:border-border-strong has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus',
        highlight && 'motion-safe:animate-arrive',
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
        className="mt-4 line-clamp-3 font-display text-title wrap-break-word"
      >
        <Link
          ref={linkRef}
          to={blogPath(blog.id)}
          className="decoration-accent-soft decoration-1 underline-offset-4 outline-none group-hover:underline after:absolute after:inset-0"
        >
          {blog.title}
        </Link>
      </h2>

      <p className="mt-2 line-clamp-2 wrap-break-word text-text-muted sm:line-clamp-3">
        {previewOf(blog.body)}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-muted">
        <CategoryChip id={blog.categoryId} />
        <span className="inline-flex items-center gap-1.5">
          <ClockIcon />
          {blog.readTimeMinutes} min read
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CommentIcon />
          {plural(blog.commentCount, 'comment', 'comments')}
        </span>
      </div>
    </article>
  );
}

export function BlogCardSkeleton() {
  return (
    <div aria-hidden="true" className="border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="size-9 shrink-0 animate-shimmer rounded-full bg-border/70" />
        <div className="flex-1">
          <span className="block h-3 w-40 max-w-full animate-shimmer bg-border/70" />
          <span className="mt-2 block h-2.5 w-28 animate-shimmer bg-border/70" />
        </div>
      </div>
      <span className="mt-5 block h-5 w-4/5 animate-shimmer bg-border/70" />
      <span className="mt-3 block h-3 w-full animate-shimmer bg-border/70" />
      <span className="mt-2 block h-3 w-3/5 animate-shimmer bg-border/70" />
      <div className="mt-5 flex gap-4">
        <span className="block h-4 w-20 animate-shimmer bg-border/70" />
        <span className="block h-4 w-16 animate-shimmer bg-border/70" />
      </div>
    </div>
  );
}
