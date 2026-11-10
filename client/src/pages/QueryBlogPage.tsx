import { Link, useParams } from 'react-router';

import { usePageHead } from '../app/head';
import { Button } from '../components/ui/Button';
import { buttonClasses } from '../components/ui/buttonClasses';
import { CommentsSection } from '../features/blogs/components/comments/CommentsSection';
import { QUERY_COPY } from '../features/blogs/components/comments/threadContext';
import { BackLink } from '../features/blogs/components/shared/BackLink';
import { BlogsLayout } from '../features/blogs/components/shared/BlogsLayout';
import { PinIcon } from '../features/blogs/components/shared/Icons';
import { RelativeTime } from '../features/blogs/components/shared/RelativeTime';
import { Skeleton } from '../features/blogs/components/shared/Skeleton';
import { StateMessage } from '../features/blogs/components/shared/StateMessage';
import { blogsTabPath } from '../features/blogs/lib/paths';
import { plural } from '../features/blogs/lib/text';
import { useQueryBlog } from '../features/blogs/state/hooks';

export function QueryBlogPage() {
  const { topicSlug = '' } = useParams();
  const { data: topic, status, retry } = useQueryBlog(topicSlug);
  const backTo = blogsTabPath('queries');

  usePageHead(
    topic
      ? {
          title: `${topic.topic} Query Blog — The Blue Bridge`,
          description: `${topic.description} Ask the Blue Bridge community.`,
        }
      : status === 'missing'
        ? {
            title: 'Query Blog not found — The Blue Bridge',
            description: 'This Query Blog could not be found.',
            noindex: true,
          }
        : null,
  );

  return (
    <BlogsLayout activeTopicSlug={topicSlug}>
      <BackLink fallback={backTo} label="Query Blogs" className="lg:mt-4" />

      <div className="mt-4">
        {topic ? (
          <>
            <header className="border-b border-border pb-8">
              <p className="flex items-center gap-2 text-xs tracking-caps text-text-muted uppercase">
                <PinIcon
                  className={
                    topic.tone === 'blue' ? 'size-3.5 text-accent' : 'size-3.5 text-accent-2'
                  }
                />
                Pinned Query Blog
              </p>
              <h1
                id="page-title"
                className="mt-3 text-h1 tracking-tight wrap-break-word motion-safe:animate-rise"
              >
                {topic.topic}
              </h1>
              <p className="mt-3 max-w-reading text-lg text-text-muted">{topic.description}</p>
              <p className="mt-4 flex flex-wrap items-center gap-x-2 text-sm text-text-muted">
                <span className="font-medium text-text">
                  {plural(topic.queryCount, 'query', 'queries')}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  last active <RelativeTime iso={topic.lastActivityAt} />
                </span>
              </p>
            </header>
            <div className="mt-8">
              <CommentsSection
                subject={{ kind: 'query', topicSlug: topic.slug }}
                copy={QUERY_COPY}
                authorId={null}
              />
            </div>
          </>
        ) : status === 'missing' ? (
          <StateMessage
            headingLevel="h1"
            title="We couldn’t find that Query Blog"
            action={
              <Link to={backTo} className={buttonClasses()}>
                See all Query Blogs
              </Link>
            }
          >
            Query Blogs are pinned topics such as Finance, Tech and Health. This one doesn’t exist.
          </StateMessage>
        ) : status === 'error' ? (
          <StateMessage
            role="alert"
            headingLevel="h1"
            title="This Query Blog didn’t load"
            action={
              <Button variant="outline" onClick={retry}>
                Try again
              </Button>
            }
          >
            Check your connection and try again.
          </StateMessage>
        ) : (
          <div aria-busy="true">
            <span className="sr-only">Loading Query Blog…</span>
            <Skeleton className="h-3 w-36" />
            <Skeleton className="mt-4 h-10 w-1/2" />
            <Skeleton className="mt-4 h-4 w-3/4" />
          </div>
        )}
      </div>
    </BlogsLayout>
  );
}
