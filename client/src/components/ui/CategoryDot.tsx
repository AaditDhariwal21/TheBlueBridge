import { CATEGORY_BG, type CategoryColor } from '../../lib/categoryColor';
import { cn } from '../../lib/cn';

interface CategoryDotProps {
  color: CategoryColor;
  /** On a filled (navy) background: adds a paper ring so dark dots stay visible. */
  onFill?: boolean;
  className?: string;
}

/** A category's colour dot. Decorative: the category's name is always shown beside it. */
export function CategoryDot({ color, onFill = false, className }: CategoryDotProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block size-2 shrink-0 rounded-full',
        CATEGORY_BG[color],
        onFill && 'ring-1 ring-on-primary',
        className,
      )}
    />
  );
}
