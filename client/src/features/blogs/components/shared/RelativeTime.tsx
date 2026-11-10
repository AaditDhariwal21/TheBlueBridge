import { cn } from '../../../../lib/cn';
import { useNow } from '../../../../lib/useNow';
import { formatFull, formatRelative } from '../../lib/time';

/** "3 hr ago", kept fresh by the shared clock, with the full date on hover. */
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  const now = useNow();
  return (
    <time dateTime={iso} title={formatFull(iso)} className={cn('whitespace-nowrap', className)}>
      {formatRelative(iso, now)}
    </time>
  );
}
