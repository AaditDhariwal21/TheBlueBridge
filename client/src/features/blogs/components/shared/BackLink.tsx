import type { MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { cn } from '../../../../lib/cn';
import { ArrowLeftIcon } from './Icons';

interface BackLinkProps {
  /** Where to go when there is no in-app history (e.g. a shared link). */
  fallback: string;
  label: string;
  className?: string;
}

/**
 * "Back" that behaves like the browser's back button when the user came from
 * inside the app, so the feed's tab and scroll position are restored. On a
 * direct visit it is a normal link to `fallback`. It is always a real link,
 * so open-in-new-tab still works.
 */
export function BackLink({ fallback, label, className }: BackLinkProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const hasHistory = location.key !== 'default';

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (!hasHistory || modified || event.button !== 0) return;
    event.preventDefault();
    void navigate(-1);
  };

  return (
    <Link
      to={fallback}
      onClick={handleClick}
      className={cn(
        '-ml-2 inline-flex min-h-11 items-center gap-2 px-2 text-sm text-text-muted transition-colors hover:text-text',
        className,
      )}
    >
      <ArrowLeftIcon />
      {label}
    </Link>
  );
}
