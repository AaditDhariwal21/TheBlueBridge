import { Button } from '../../../../components/ui/Button';
import { useQueryBlogs } from '../../state/hooks';
import { Skeleton } from '../shared/Skeleton';
import { StateMessage } from '../shared/StateMessage';
import { QueryBlogCard } from './QueryBlogCard';

interface QueryBlogListProps {
  activeSlug?: string | undefined;
  headingLevel?: 'h2' | 'h3';
}

/** The pinned topic cards, with loading and error states. */
export function QueryBlogList({ activeSlug, headingLevel = 'h3' }: QueryBlogListProps) {
  const { queryBlogs, status, retry } = useQueryBlogs();

  if (status === 'error') {
    return (
      <StateMessage
        role="alert"
        headingLevel={headingLevel}
        title="Couldn’t load Query Blogs"
        action={
          <Button variant="outline" onClick={retry}>
            Try again
          </Button>
        }
      >
        Check your connection and try again.
      </StateMessage>
    );
  }

  if (status === 'ready' && queryBlogs.length === 0) {
    return (
      <StateMessage headingLevel={headingLevel} title="No Query Blogs yet">
        Topic spaces will appear here.
      </StateMessage>
    );
  }

  if (queryBlogs.length === 0) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Loading Query Blogs…</span>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="border border-border bg-surface p-4">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {queryBlogs.map((q) => (
        <li key={q.slug}>
          <QueryBlogCard queryBlog={q} active={q.slug === activeSlug} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
