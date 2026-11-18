import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { usePageHead } from '../app/head';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DeadEnd } from '../components/ui/DeadEnd';
import { StateMessage } from '../components/ui/StateMessage';
import { buttonClasses, dangerTextClasses } from '../components/ui/buttonClasses';
import { useToast } from '../components/ui/toast';
import { canModerate } from '../features/auth/permissions';
import { BlogArticle, BlogArticleSkeleton } from '../features/blogs/components/article/BlogArticle';
import { ReadingProgress } from '../features/blogs/components/article/ReadingProgress';
import { CommentsSection } from '../features/blogs/components/comments/CommentsSection';
import { BLOG_COMMENTS_COPY } from '../features/blogs/components/comments/threadContext';
import { BackLink } from '../features/blogs/components/shared/BackLink';
import { BlogsLayout } from '../features/blogs/components/shared/BlogsLayout';
import { BLOGS_PATH } from '../features/blogs/lib/paths';
import type { Blog } from '../features/blogs/model/types';
import { useBlog, useDeleteBlog } from '../features/blogs/state/hooks';
import { useBlogActor } from '../features/blogs/state/viewer';

const DESCRIPTION_LENGTH = 155;

export function BlogPage() {
  const { blogId = '' } = useParams();
  const { data: blog, status, retry } = useBlog(blogId);
  const articleRef = useRef<HTMLElement>(null);

  usePageHead(
    blog
      ? {
          title: `${blog.title} — The Blue Bridge`,
          description: summarise(blog.body ?? blog.excerpt),
        }
      : status === 'missing'
        ? {
            title: 'Blog not available — The Blue Bridge',
            description: 'This blog is no longer available.',
            noindex: true,
          }
        : null,
  );

  return (
    <BlogsLayout
      header={
        <div className="flex flex-wrap items-center justify-between gap-x-4 pb-6 lg:pt-4">
          <BackLink fallback={BLOGS_PATH} label="Back to all blogs" />
          {blog && <RemoveBlog blog={blog} />}
        </div>
      }
    >
      <div>
        {blog ? (
          <>
            <ReadingProgress target={articleRef} />
            <BlogArticle ref={articleRef} blog={blog} />
            {/* The conversation sits on its own surface, clearly apart from the article. */}
            <div className="-mx-gutter mt-14 border-y border-border bg-surface px-gutter py-10 sm:mx-0 sm:border-x sm:px-8 sm:py-10">
              <CommentsSection
                subject={{ kind: 'blog', blogId: blog.id }}
                copy={BLOG_COMMENTS_COPY}
                authorId={blog.author.id}
                categoryIds={blog.categories.map((category) => category.id)}
              />
            </div>
          </>
        ) : status === 'missing' ? (
          <DeadEnd
            headingLevel="h1"
            title="This blog is no longer available"
            actions={
              <Link to={BLOGS_PATH} className={buttonClasses()}>
                Back to the feed
              </Link>
            }
          >
            <p>It may have been removed by its author or a moderator, or the link is incomplete.</p>
          </DeadEnd>
        ) : status === 'error' ? (
          <StateMessage
            role="alert"
            headingLevel="h1"
            title="This blog didn’t load"
            action={
              <Button variant="subtle" onClick={retry}>
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

/** Moderators only: removes the blog after a confirmation, then returns to the feed. */
function RemoveBlog({ blog }: { blog: Blog }) {
  const actor = useBlogActor();
  const deleteBlog = useDeleteBlog();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  if (
    !canModerate(
      actor,
      blog.categories.map((category) => category.id),
    )
  )
    return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setConfirming(true);
        }}
        aria-haspopup="dialog"
        className={dangerTextClasses('-mr-2')}
      >
        Remove blog
      </button>
      <ConfirmDialog
        open={confirming}
        title="Remove this blog?"
        tone="danger"
        confirmLabel="Remove blog"
        busyLabel="Removing…"
        onClose={() => {
          setConfirming(false);
        }}
        onConfirm={async () => {
          await deleteBlog(blog.id);
          setConfirming(false);
          toast.success('The blog was removed.');
          void navigate(BLOGS_PATH, { replace: true });
        }}
      >
        <p>
          <strong className="font-medium text-text">{blog.title}</strong> will disappear from the
          feed, along with its comments. This can’t be undone.
        </p>
      </ConfirmDialog>
    </>
  );
}

function summarise(body: string): string {
  const text = body.replace(/\s+/g, ' ').trim();
  if (text.length <= DESCRIPTION_LENGTH) return text;
  return `${text.slice(0, DESCRIPTION_LENGTH - 1).replace(/\s+\S*$/, '')}…`;
}
