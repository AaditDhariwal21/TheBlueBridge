import { cn } from '../../lib/cn';

interface CharacterCountProps {
  id?: string;
  count: number;
  /** Below this, says how many more characters are needed. */
  min?: number;
  /** Shows "120 / 140" (red over the limit). */
  max?: number;
  /** Show the "count / max" only once the text is this close to the limit (fraction of max). */
  revealAt?: number;
  className?: string;
}

/**
 * Length feedback under a field: "8 characters minimum", then "3 more characters needed",
 * then "120 / 140", red over the limit. Not a live region: announcing every keystroke is noise;
 * the field's hint states the rule and its error covers a submit that breaks it.
 */
export function CharacterCount({
  id,
  count,
  min,
  max,
  revealAt = 0,
  className,
}: CharacterCountProps) {
  if (min !== undefined && count < min) {
    const needed = min - count;
    return (
      <span id={id} className={cn('text-xs text-text-muted tabular-nums', className)}>
        {count === 0
          ? `${min} characters minimum`
          : `${needed} more ${needed === 1 ? 'character' : 'characters'} needed`}
      </span>
    );
  }
  if (max === undefined || count < max * revealAt) return null;
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
