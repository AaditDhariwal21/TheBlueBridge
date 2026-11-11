import { Link, useLocation } from 'react-router';

import { useAuth } from '../../../auth/authContext';
import { AUTH_PATHS, signInPathFor } from '../../../auth/paths';
import { cn } from '../../../../lib/cn';

const LINK =
  'font-medium text-text underline decoration-accent-2-soft underline-offset-4 hover:decoration-text';

interface JoinPromptProps {
  /** What the viewer can't do yet, e.g. "comment" or "write a blog". */
  action: string;
  /** `panel` replaces a composer; `inline` replaces a button in a header. */
  variant?: 'panel' | 'inline';
  className?: string;
}

/**
 * Shown where a composer or a "Write" button would be, for people who can't
 * post yet: signed-out visitors, and accounts that aren't approved. Approved
 * members never see it.
 */
export function JoinPrompt({ action, variant = 'panel', className }: JoinPromptProps) {
  const { state } = useAuth();
  const { pathname, search } = useLocation();
  if (state.status === 'loading') return null;
  if (state.status === 'signedIn' && state.me.status === 'approved') return null;

  let message;
  if (state.status === 'signedIn') {
    message =
      state.me.status === 'pending' ? (
        <>
          Your account is waiting for approval. You can {action} once an admin approves it.{' '}
          <Link to={AUTH_PATHS.account} className={LINK}>
            Check your status
          </Link>
        </>
      ) : (
        <>Your account isn’t active, so you can’t {action}.</>
      );
  } else {
    message = (
      <>
        <Link to={signInPathFor(pathname + search)} className={LINK}>
          Sign in
        </Link>{' '}
        to {action}.
        {variant === 'panel' && (
          <>
            {' '}
            Have an invitation?{' '}
            <Link to={AUTH_PATHS.signUp} className={LINK}>
              Create your account
            </Link>
          </>
        )}
      </>
    );
  }

  return (
    <p
      className={cn(
        'text-sm text-text-muted',
        variant === 'panel' && 'border border-dashed border-border bg-surface px-4 py-4',
        className,
      )}
    >
      {message}
    </p>
  );
}
