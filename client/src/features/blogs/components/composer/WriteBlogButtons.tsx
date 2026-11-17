import type { Ref } from 'react';

import { Avatar } from '../../../../components/ui/Avatar';
import { Button } from '../../../../components/ui/Button';
import { useViewerAuthor } from '../../state/viewer';
import { PenIcon } from '../shared/Icons';

interface WriteBlogProps {
  onClick: () => void;
  composerOpen: boolean;
}

/** "Write a blog" as a plain button (the feed's empty state). */
export function WriteBlogButton({ onClick, composerOpen }: WriteBlogProps) {
  return (
    <Button onClick={onClick} aria-haspopup="dialog" aria-expanded={composerOpen}>
      <PenIcon />
      Write a blog
    </Button>
  );
}

/**
 * The feed's main entry point: a quiet "what would you like to share?" bar with the member's
 * avatar. The whole bar opens the composer; its name is simply "Write a blog".
 */
export function ComposeBar({
  onClick,
  composerOpen,
  ref,
}: WriteBlogProps & { ref?: Ref<HTMLButtonElement> }) {
  const viewer = useViewerAuthor();
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={composerOpen}
      aria-label="Write a blog"
      className="group flex w-full items-center gap-3 border border-border bg-surface p-3 text-left transition-colors hover:border-accent-soft active:bg-bg sm:gap-4 sm:p-4"
    >
      {viewer && <Avatar user={viewer} size="lg" className="hidden min-[22rem]:grid" />}
      <span
        aria-hidden="true"
        className="min-w-0 flex-1 truncate py-2 text-text-muted transition-colors group-hover:text-text"
      >
        What would you like to share?
      </span>
      <span
        aria-hidden="true"
        className="inline-flex min-h-11 shrink-0 items-center gap-2 border border-primary bg-primary px-4 text-sm font-medium text-on-primary transition-colors group-hover:bg-transparent group-hover:text-primary sm:px-5"
      >
        <PenIcon />
        Write<span className="hidden sm:inline"> a blog</span>
      </span>
    </button>
  );
}

/**
 * Mobile entry point once the compose bar has scrolled away: an extended floating action
 * button, clear of the iOS home indicator. The thin paper border keeps it visible over the
 * navy footer.
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
