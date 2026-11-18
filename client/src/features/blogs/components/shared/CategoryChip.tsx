import { CategoryDot } from '../../../../components/ui/CategoryDot';
import { CATEGORY_TINT_BG } from '../../../../lib/categoryColor';
import { cn } from '../../../../lib/cn';
import type { Category } from '../../model/types';

/** A category tag: a pill in the category's light tint with its dot. Long names truncate. */
export function CategoryChip({ category, className }: { category: Category; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-text',
        CATEGORY_TINT_BG[category.color],
        className,
      )}
    >
      <CategoryDot color={category.color} />
      <span className="truncate">{category.name}</span>
    </span>
  );
}
