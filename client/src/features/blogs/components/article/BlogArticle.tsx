import type { Ref } from 'react';

import { Avatar } from '../../../../components/ui/Avatar';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { formatDate, formatFull } from '../../lib/time';
import { toParagraphs } from '../../lib/text';
import type { Blog } from '../../model/types';
import { CategoryChip } from '../shared/CategoryChip';
import { ClockIcon } from '../shared/Icons';
import { ShareButton } from '../shared/ShareButton';
import { RichText } from './RichText';

/**
 * The full blog for reading: a large title (the page's h1), the author block (photo or
 * initials, name, occupation, date, reading time, categories) and the body in a column about
 * 65-70 characters wide, at 18px with generous line height.
 */
export function BlogArticle({ blog, ref }: { blog: Blog; ref?: Ref<HTMLElement> }) {
  return (
    <article ref={ref} aria-labelledby="page-title">
      <header>
        <h1
          id="page-title"
          className="max-w-article text-h1 font-semibold tracking-tight wrap-break-word text-primary motion-safe:animate-rise"
        >
          {blog.title}
        </h1>

        <div className="mt-7 flex max-w-article items-center gap-4">
          <Avatar user={blog.author} size="xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-text">{blog.author.name}</p>
            <p className="truncate text-sm text-text-muted">{blog.author.profession}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-text-muted">
              <time dateTime={blog.createdAt} title={formatFull(blog.createdAt)}>
                {formatDate(blog.createdAt)}
              </time>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon />
                {blog.readTimeMinutes} min read
              </span>
            </p>
          </div>
          <ShareButton blogId={blog.id} className="self-start sm:self-center" />
        </div>

        {blog.categories.length > 0 && (
          <ul aria-label="Categories" className="mt-5 flex flex-wrap gap-2">
            {blog.categories.map((category) => (
              <li key={category.id} className="max-w-full min-w-0">
                <CategoryChip category={category} />
              </li>
            ))}
          </ul>
        )}
      </header>

      <div className="mt-8 max-w-article border-t border-border pt-8 sm:mt-10 sm:pt-10">
        {blog.content ? (
          <RichText doc={blog.content} className="text-reading" />
        ) : (
          <div className="rich-text text-reading">
            {toParagraphs(blog.body ?? blog.excerpt).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        )}
      </div>

      <div aria-hidden="true" className="mt-12 flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-accent-soft" />
        <span className="h-px w-16 bg-linear-to-r from-accent-soft to-accent-2-soft" />
        <span className="size-1.5 rounded-full bg-accent-2-soft" />
      </div>
    </article>
  );
}

export function BlogArticleSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading blog…</span>
      <Skeleton className="h-10 w-11/12 max-w-article" />
      <Skeleton className="mt-3 h-10 w-2/3 max-w-article" />
      <div className="mt-7 flex items-center gap-4">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="mt-2 h-3 w-28" />
          <Skeleton className="mt-2 h-3 w-40" />
        </div>
      </div>
      <div className="mt-8 max-w-article space-y-3 border-t border-border pt-8 sm:mt-10 sm:pt-10">
        {['w-full', 'w-full', 'w-11/12', 'w-full', 'w-3/4'].map((w, i) => (
          <Skeleton key={i} className={`h-4 ${w}`} />
        ))}
      </div>
    </div>
  );
}
