import { Link } from 'react-router';

import { SITE_NAME } from '../../app/site';
import { cn } from '../../lib/cn';

interface WordmarkProps {
  className?: string;
  onClick?: () => void;
}

/** The text wordmark used in the header and footer (Playfair, as in the reference). */
export function Wordmark({ className, onClick }: WordmarkProps) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className={cn('font-display text-wordmark text-text', className)}
    >
      {SITE_NAME}
    </Link>
  );
}
