import { cn } from '../../../../lib/cn';
import { getCategory } from '../../model/categories';
import type { CategoryId } from '../../model/types';

/** Square, hairline chip with a brand-accent dot. */
export function CategoryChip({ id, className }: { id: CategoryId; className?: string }) {
  const category = getCategory(id);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border border-border px-2 py-0.5 text-xs whitespace-nowrap text-text-muted',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 rounded-full',
          category.tone === 'blue' ? 'bg-accent-soft' : 'bg-accent-2-soft',
        )}
      />
      {category.label}
    </span>
  );
}
