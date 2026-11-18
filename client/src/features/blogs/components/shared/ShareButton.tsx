import { useToast } from '../../../../components/ui/toast';
import { copyText } from '../../../../lib/clipboard';
import { blogPath } from '../../lib/paths';
import { LinkIcon } from './Icons';

interface ShareButtonProps {
  blogId: string;
}

/**
 * "Copy link" in the article's author block: copies the blog's full URL and confirms with a
 * toast. 32px to look at, 44px to touch.
 */
export function ShareButton({ blogId }: ShareButtonProps) {
  const toast = useToast();

  const share = async () => {
    const url = new URL(blogPath(blogId), window.location.origin).href;
    if (await copyText(url)) toast.success('Link copied');
    else toast.error('Couldn’t copy the link. Copy it from the address bar instead.');
  };

  return (
    <button
      type="button"
      onClick={() => void share()}
      className="relative inline-flex h-8 shrink-0 items-center justify-center gap-1.5 border border-border px-3 text-meta font-medium text-text-muted transition-colors before:absolute before:-inset-1.5 hover:border-border-strong hover:text-text active:bg-bg"
    >
      <LinkIcon />
      Copy link
    </button>
  );
}
