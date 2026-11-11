import { cn } from '../../lib/cn';

/** A placeholder bar. Pair with an `aria-busy` region and a visually hidden label. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('block animate-shimmer bg-border/70', className)} />
  );
}
