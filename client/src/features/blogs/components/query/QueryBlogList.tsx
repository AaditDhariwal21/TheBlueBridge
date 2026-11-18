import { Button } from '../../../../components/ui/Button';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { useQueryBlogs } from '../../state/hooks';
import { QueryBlogCard } from './QueryBlogCard';
import { StartQueryBlog } from './StartQueryBlog';

interface QueryBlogListProps {
  headingLevel?: 'h2' | 'h3';
}

/**
 * The pinned Query Blogs as rows inside the "Query Blogs" panel, with loading, empty
 * and error states, and "Start a Query Blog" for admins while a category has none.
 */
export function QueryBlogList({ headingLevel = 'h3' }: QueryBlogListProps) {
  const { queryBlogs, status, retry } = useQueryBlogs();
  const Heading = headingLevel;

  let content;
  if (status === 'error') {
    content = (
      <div role="alert" className="flex flex-col items-start gap-3 px-6 py-4">
        <Heading className="text-sm font-semibold text-text">Couldn’t load Query Blogs</Heading>
        <p className="text-sm text-text-muted">Check your connection and try again.</p>
        <Button variant="subtle" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  } else if (status === 'ready' && queryBlogs.length === 0) {
    content = (
      <div className="px-6 py-4">
        <Heading className="text-sm font-semibold text-text">No Query Blogs yet</Heading>
        <p className="mt-1 text-sm text-text-muted">
          Each category gets one. Started by admins, answered by its ambassadors.
        </p>
      </div>
    );
  } else if (queryBlogs.length === 0) {
    content = (
      <div aria-busy="true" className="divide-y divide-border">
        <span className="sr-only">Loading Query Blogs…</span>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="px-6 py-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-5 w-2/3" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-3 h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  } else {
    content = (
      <ul className="divide-y divide-border">
        {queryBlogs.map((q) => (
          <li key={q.id}>
            <QueryBlogCard queryBlog={q} headingLevel={headingLevel} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="border-t border-border">
      {content}
      {/* Empty (and so hidden) for everyone but admins with a category still free. */}
      <div className="border-t border-border px-6 py-4 empty:hidden">
        <StartQueryBlog />
      </div>
    </div>
  );
}
