import { CategoryDot } from '../../../../components/ui/CategoryDot';
import { cn } from '../../../../lib/cn';
import type { Category } from '../../model/types';

/**
 * A soft, square tag: the paper tone with the category's colour dot. Long names truncate
 * rather than push the row wider than a phone.
 */
export function CategoryChip({ category, className }: { category: Category; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 bg-bg px-2.5 py-1 text-xs font-medium text-text-muted',
        className,
      )}
    >
      <CategoryDot color={category.color} />
      <span className="truncate">{category.name}</span>
    </span>
  );
}
