import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '../../../../components/ui/Button';
import { canCreateQueryBlog } from '../../../auth/permissions';
import { useCategories } from '../../../categories/useCategories';
import { queryBlogPath } from '../../lib/paths';
import { useQueryBlogs } from '../../state/hooks';
import { useBlogActor } from '../../state/viewer';
import { QueryBlogComposer } from './QueryBlogComposer';

/**
 * "Start a Query Blog", shown only to admins, and only while some category
 * still has no Query Blog. Renders nothing otherwise.
 */
export function StartQueryBlog() {
  const actor = useBlogActor();
  const categories = useCategories();
  const { queryBlogs, status } = useQueryBlogs();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const startable = useMemo(() => {
    if (!canCreateQueryBlog(actor) || categories.status !== 'ready' || status !== 'ready')
      return [];
    const taken = new Set(queryBlogs.map((q) => q.category.id));
    return categories.categories.filter((category) => !taken.has(category.id));
  }, [actor, categories, queryBlogs, status]);

  if (startable.length === 0 && !open) return null;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="w-full"
      >
        Start a Query Blog
      </Button>
      <QueryBlogComposer
        open={open}
        categories={startable}
        onClose={() => {
          setOpen(false);
        }}
        onCreated={(queryBlog) => {
          setOpen(false);
          void navigate(queryBlogPath(queryBlog.id));
        }}
      />
    </>
  );
}
