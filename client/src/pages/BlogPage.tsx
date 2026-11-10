import { Link, useParams } from 'react-router';

import { usePageHead } from '../app/head';
import { Button } from '../components/ui/Button';
import { buttonClasses } from '../components/ui/buttonClasses';
import { BlogArticle, BlogArticleSkeleton } from '../features/blogs/components/article/BlogArticle';
import { CommentsSection } from '../features/blogs/components/comments/CommentsSection';
import { BLOG_COMMENTS_COPY } from '../features/blogs/components/comments/threadContext';
import { BackLink } from '../features/blogs/components/shared/BackLink';
import { BlogsLayout } from '../features/blogs/components/shared/BlogsLayout';
import { StateMessage } from '../features/blogs/components/shared/StateMessage';
import { BLOGS_PATH } from '../features/blogs/lib/paths';
import { useBlog } from '../features/blogs/state/hooks';

const DESCRIPTION_LENGTH = 155;

export function BlogPage() {
  const { blogId = '' } = useParams();
  const { data: blog, status, retry } = useBlog(blogId);

  usePageHead(
    blog
      ? {
          title: `${blog.title} — The Blue Bridge`,
          description: summarise(blog.body),
        }
      : status === 'missing'
        ? {
            title: 'Blog not found — The Blue Bridge',
            description: 'This blog could not be found.',
            noindex: true,
          }
        : null,
  );

  return (
    <BlogsLayout>
      <BackLink fallback={BLOGS_PATH} label="All blogs" className="lg:mt-4" />

      <div className="mt-4">
        {blog ? (
          <>
            <BlogArticle blog={blog} />
            <div className="mt-12 border-t border-border pt-10">
              <CommentsSection
                subject={{ kind: 'blog', blogId: blog.id }}
                copy={BLOG_COMMENTS_COPY}
                authorId={blog.author.id}
              />
            </div>
          </>
        ) : status === 'missing' ? (
          <StateMessage
            headingLevel="h1"
            title="We couldn’t find that blog"
            action={
              <Link to={BLOGS_PATH} className={buttonClasses()}>
                Browse all blogs
              </Link>
            }
          >
            It may have been removed, or the link may be incomplete.
          </StateMessage>
        ) : status === 'error' ? (
          <StateMessage
            role="alert"
            headingLevel="h1"
            title="This blog didn’t load"
            action={
              <Button variant="outline" onClick={retry}>
                Try again
              </Button>
            }
          >
            Check your connection and try again.
          </StateMessage>
        ) : (
          <BlogArticleSkeleton />
        )}
      </div>
    </BlogsLayout>
  );
}

function summarise(body: string): string {
  const text = body.replace(/\s+/g, ' ').trim();
  if (text.length <= DESCRIPTION_LENGTH) return text;
  return `${text.slice(0, DESCRIPTION_LENGTH - 1).replace(/\s+\S*$/, '')}…`;
}
