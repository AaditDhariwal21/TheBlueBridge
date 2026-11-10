import { Button } from '../../../../components/ui/Button';
import { PenIcon } from '../shared/Icons';

interface WriteBlogProps {
  onClick: () => void;
  composerOpen: boolean;
}

/** Desktop entry point, beside the page heading. */
export function WriteBlogButton({ onClick, composerOpen }: WriteBlogProps) {
  return (
    <Button onClick={onClick} aria-haspopup="dialog" aria-expanded={composerOpen}>
      <PenIcon />
      Write a blog
    </Button>
  );
}

/**
 * Mobile entry point: an extended floating action button, clear of the iOS
 * home indicator. The thin paper border keeps it visible over the navy footer.
 */
export function WriteBlogFab({ onClick, composerOpen }: WriteBlogProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={composerOpen}
      className="fixed right-gutter bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-30 inline-flex min-h-14 items-center gap-2 border border-on-primary/30 bg-primary px-5 text-sm font-medium text-on-primary transition-transform active:scale-95 motion-safe:animate-rise lg:hidden"
    >
      <PenIcon className="size-5" />
      Write a blog
    </button>
  );
}
