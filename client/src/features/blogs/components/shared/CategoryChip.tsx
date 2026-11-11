import { CategoryDot } from '../../../../components/ui/CategoryDot';
import { cn } from '../../../../lib/cn';
import type { Category } from '../../model/types';

/** Square, hairline chip with the category's colour dot. */
export function CategoryChip({ category, className }: { category: Category; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border border-border px-2 py-0.5 text-xs whitespace-nowrap text-text-muted',
        className,
      )}
    >
      <CategoryDot color={category.color} />
      {category.name}
    </span>
  );
}
