import type { ReactNode } from 'react';

import { formatDate } from '../../lib/time';
import { toParagraphs } from '../../lib/text';
import type { Blog } from '../../model/types';
import { Avatar } from '../shared/Avatar';
import { CategoryChip } from '../shared/CategoryChip';
import { ClockIcon } from '../shared/Icons';
import { RichText } from './RichText';
import { RelativeTime } from '../shared/RelativeTime';
import { Skeleton } from '../../../../components/ui/Skeleton';

/**
 * The full blog: meta, title (the page's h1), author and long-form body.
 * `actions` sits beside the meta line (e.g. a moderator's Remove button).
 */
export function BlogArticle({ blog, actions }: { blog: Blog; actions?: ReactNode }) {
  const paragraphs = toParagraphs(blog.body ?? blog.excerpt);
  return (
    <article aria-labelledby="page-title">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-text-muted">
        {blog.categories.map((category) => (
          <CategoryChip key={category.id} category={category} />
        ))}
        <span className="inline-flex items-center gap-1.5">
          <ClockIcon />
          {blog.readTimeMinutes} min read
        </span>
        {actions && <span className="ml-auto">{actions}</span>}
      </div>

      <h1
        id="page-title"
        className="mt-4 text-h2 tracking-tight wrap-break-word motion-safe:animate-rise"
      >
        {blog.title}
      </h1>

      <div className="mt-6 flex items-center gap-3 border-y border-border py-4">
        <Avatar user={blog.author} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{blog.author.name}</p>
          <p className="truncate text-sm text-text-muted">{blog.author.profession}</p>
        </div>
        <p className="shrink-0 text-right text-xs text-text-muted">
          <time dateTime={blog.createdAt} className="block">
            {formatDate(blog.createdAt)}
          </time>
          <RelativeTime iso={blog.createdAt} />
        </p>
      </div>

      {blog.content ? (
        <RichText doc={blog.content} className="mt-8 max-w-reading text-lg" />
      ) : (
        <div className="mt-8 max-w-reading space-y-6 text-lg wrap-break-word text-text">
          {paragraphs.map((paragraph, i) => (
            <p key={i} className={i === 0 && paragraphs.length > 1 ? 'text-body-lg' : undefined}>
              {paragraph}
            </p>
          ))}
        </div>
      )}

      <div
        aria-hidden="true"
        className="mt-12 h-px w-24 bg-linear-to-r from-accent-soft to-accent-2-soft"
      />
    </article>
  );
}

export function BlogArticleSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading blog…</span>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-5 h-8 w-11/12" />
      <Skeleton className="mt-3 h-8 w-2/3" />
      <div className="mt-6 flex items-center gap-3 border-y border-border py-4">
        <span className="size-11 animate-shimmer rounded-full bg-border/70" />
        <div className="flex-1">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="mt-2 h-3 w-28" />
        </div>
      </div>
      <div className="mt-8 space-y-3">
        {['w-full', 'w-full', 'w-11/12', 'w-full', 'w-3/4'].map((w, i) => (
          <Skeleton key={i} className={`h-4 ${w}`} />
        ))}
      </div>
    </div>
  );
}
