import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { useToast } from '../../../components/ui/toast';
import { plural } from '../../blogs/lib/text';
import type { QueryBlog } from '../../blogs/model/types';
import { useDeleteQueryBlog } from '../../blogs/state/hooks';
import { ADMIN_REASON_MAX } from '../rules';

interface RemoveQueryBlogDialogProps {
  /** The Query Blog to remove; null when closed. */
  queryBlog: QueryBlog | null;
  onClose: () => void;
  onRemoved?: () => void;
}

/** Admins: confirms removing a whole Query Blog, says what goes with it, takes a reason. */
export function RemoveQueryBlogDialog({
  queryBlog,
  onClose,
  onRemoved,
}: RemoveQueryBlogDialogProps) {
  const deleteQueryBlog = useDeleteQueryBlog();
  const toast = useToast();

  return (
    <ConfirmDialog
      open={queryBlog !== null}
      title="Remove this Query Blog?"
      tone="danger"
      confirmLabel="Remove Query Blog"
      busyLabel="Removing…"
      reason={{ label: 'Reason', max: ADMIN_REASON_MAX }}
      onClose={onClose}
      onConfirm={async (reason) => {
        if (!queryBlog) return;
        await deleteQueryBlog(queryBlog.id, reason);
        toast.success(`“${queryBlog.title}” was removed.`);
        onClose();
        onRemoved?.();
      }}
    >
      {queryBlog && (
        <>
          <p>
            <strong className="font-medium text-text">{queryBlog.title}</strong> and its{' '}
            {plural(queryBlog.queryCount, 'query', 'queries')}, with every answer, will no longer be
            shown to anyone.
          </p>
          <p className="mt-2">
            The {queryBlog.category.name} category becomes free for a new Query Blog. The removal is
            recorded in the activity log.
          </p>
        </>
      )}
    </ConfirmDialog>
  );
}
