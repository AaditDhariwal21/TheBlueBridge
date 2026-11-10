import { cn } from '../../../../lib/cn';

interface CharacterCountProps {
  id?: string;
  count: number;
  max: number;
  /** Show only once the text is this close to the limit (fraction of max). */
  revealAt?: number;
  className?: string;
}

/**
 * "120 / 140". Turns to the danger colour over the limit. Not a live region:
 * announcing every keystroke is noise; the field's error covers the limit.
 */
export function CharacterCount({ id, count, max, revealAt = 0, className }: CharacterCountProps) {
  if (count < max * revealAt) return null;
  const over = count > max;
  return (
    <span
      id={id}
      className={cn('text-xs tabular-nums', over ? 'text-danger' : 'text-text-muted', className)}
    >
      {count.toLocaleString('en-IN')} / {max.toLocaleString('en-IN')}
      {over && <span className="sr-only"> characters, over the limit</span>}
    </span>
  );
}
