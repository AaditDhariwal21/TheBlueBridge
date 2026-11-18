import { Link, useLocation } from 'react-router';

import { useToast } from '../../../../components/ui/toast';
import { cn } from '../../../../lib/cn';
import { useAuth } from '../../../auth/authContext';
import { signInPathFor } from '../../../auth/paths';
import { canWriteBlog } from '../../../auth/permissions';
import { useBlogActor } from '../../state/viewer';
import { PenIcon } from '../shared/Icons';

const STYLES = {
  /** Beside the feed's search box (the same 48px height), and in the empty feed. */
  pill: 'inline-flex h-12 shrink-0 items-center gap-2 border border-primary bg-primary px-5 text-sm font-medium whitespace-nowrap text-on-primary transition-colors hover:bg-transparent hover:text-primary active:translate-y-px',
  /**
   * Phones: an extended floating action button, clear of the iOS home indicator. The thin
   * paper border keeps it visible over the navy footer.
   */
  fab: 'fixed right-gutter bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-30 inline-flex min-h-14 items-center gap-2 border border-on-primary/30 bg-primary px-5 text-sm font-medium text-on-primary transition-transform active:scale-95 motion-safe:animate-rise lg:hidden',
} as const;

interface WriteBlogEntryProps {
  variant?: keyof typeof STYLES;
  onWrite: () => void;
  composerOpen: boolean;
}

/**
 * "Write a blog" for everyone, doing what each person can: approved members open the
 * composer; visitors go to sign in (and come back here); accounts waiting for approval see why
 * they can't yet (the floating button is left out for them). Nothing while auth is loading.
 */
export function WriteBlogEntry({ variant = 'pill', onWrite, composerOpen }: WriteBlogEntryProps) {
  const { state } = useAuth();
  const actor = useBlogActor();
  const toast = useToast();
  const { pathname, search } = useLocation();
  const className = STYLES[variant];
  const label = (
    <>
      {variant === 'fab' ? <PenIcon className="size-5" /> : <PenIcon />}
      Write a blog
    </>
  );

  if (canWriteBlog(actor)) {
    return (
      <button
        type="button"
        onClick={onWrite}
        aria-haspopup="dialog"
        aria-expanded={composerOpen}
        className={className}
      >
        {label}
      </button>
    );
  }
  if (state.status === 'signedOut') {
    return (
      <Link
        to={signInPathFor(pathname + search)}
        title="Sign in to write a blog"
        className={className}
      >
        {label}
      </Link>
    );
  }
  if (state.status === 'signedIn' && variant === 'pill') {
    const why =
      state.me.status === 'pending'
        ? 'You can write once an admin approves your account.'
        : 'Your account isn’t active, so you can’t write blogs.';
    return (
      <button
        type="button"
        aria-disabled="true"
        title={why}
        onClick={() => {
          toast.info(why);
        }}
        className={cn(
          className,
          'cursor-not-allowed opacity-70 hover:bg-primary hover:text-on-primary',
        )}
      >
        {label}
      </button>
    );
  }
  // Loading: hold the pill's place so the search box doesn't jump.
  return variant === 'pill' ? (
    <span aria-hidden="true" className={cn(className, 'invisible')}>
      {label}
    </span>
  ) : null;
}
