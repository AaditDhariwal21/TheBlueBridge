import { Button } from '../../../../components/ui/Button';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { StateMessage } from '../../../../components/ui/StateMessage';
import { useQueryBlogs } from '../../state/hooks';
import { QueryBlogCard } from './QueryBlogCard';
import { StartQueryBlog } from './StartQueryBlog';

interface QueryBlogListProps {
  activeId?: string | undefined;
  headingLevel?: 'h2' | 'h3';
}

/** The pinned Query Blogs, with loading, empty and error states, and "Start a Query Blog". */
export function QueryBlogList({ activeId, headingLevel = 'h3' }: QueryBlogListProps) {
  const { queryBlogs, status, retry } = useQueryBlogs();

  let content;
  if (status === 'error') {
    content = (
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
  } else if (status === 'ready' && queryBlogs.length === 0) {
    content = (
      <StateMessage headingLevel={headingLevel} title="No Query Blogs yet">
        Each category gets one. Started by admins, answered by its ambassadors.
      </StateMessage>
    );
  } else if (queryBlogs.length === 0) {
    content = (
      <div aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Loading Query Blogs…</span>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="border border-border bg-surface p-4">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  } else {
    content = (
      <ul className="flex flex-col gap-3">
        {queryBlogs.map((q) => (
          <li key={q.id}>
            <QueryBlogCard queryBlog={q} active={q.id === activeId} headingLevel={headingLevel} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {content}
      <StartQueryBlog />
    </div>
  );
}
