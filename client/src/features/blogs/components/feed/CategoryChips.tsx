import type { ReactNode } from 'react';

import { CategoryDot } from '../../../../components/ui/CategoryDot';
import { Skeleton } from '../../../../components/ui/Skeleton';
import {
  CATEGORY_CHIP_BORDER,
  CATEGORY_TINT_BG,
  type CategoryColor,
} from '../../../../lib/categoryColor';
import { cn } from '../../../../lib/cn';
import { useCategories } from '../../../categories/useCategories';

interface CategoryChipsProps {
  /** Selected category ids; empty means "All". */
  value: string[];
  onChange: (ids: string[]) => void;
}

/**
 * The feed's category filter: "All" plus a toggle chip per category (any match). Always one
 * row: when the chips outgrow it (phones, or more categories later) it scrolls sideways. The
 * row reaches into the gutters on both sides, where its edges fade, so the first chip still
 * lines up with the search box and nothing is faded until it scrolls.
 */
export function CategoryChips({ value, onChange }: CategoryChipsProps) {
  const categories = useCategories();
  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <div
      role="group"
      aria-label="Filter by category"
      aria-busy={categories.status === 'loading' || undefined}
      className={cn(
        '-mx-gutter flex [scrollbar-width:none] gap-2 overflow-x-auto overscroll-x-contain px-gutter py-1',
        '[mask-image:linear-gradient(to_right,transparent,black_1.25rem,black_calc(100%-1.25rem),transparent)]',
      )}
    >
      <Chip
        pressed={value.length === 0}
        onClick={() => {
          onChange([]);
        }}
      >
        All
      </Chip>
      {categories.status === 'loading' &&
        ['w-24', 'w-20', 'w-28', 'w-24'].map((width, i) => (
          <Skeleton key={i} className={cn('h-9 shrink-0 rounded-full', width)} />
        ))}
      {categories.status === 'error' && (
        <button
          type="button"
          onClick={categories.retry}
          className="h-9 shrink-0 rounded-full px-3 text-sm whitespace-nowrap text-danger underline underline-offset-4 hover:text-danger-strong"
        >
          Categories didn’t load. Try again
        </button>
      )}
      {categories.status === 'ready' &&
        categories.categories.map((category) => (
          <Chip
            key={category.id}
            color={category.color}
            pressed={value.includes(category.id)}
            onClick={() => {
              toggle(category.id);
            }}
          >
            {category.name}
          </Chip>
        ))}
    </div>
  );
}

/*
 * Filter chip styles, all here so the look is a small change to make (or undo).
 * Unselected: white, a hairline, dark text, the category dot. Selected: the category's tint
 * with a slightly darker border and semibold text ("All": navy with white text), so the state
 * never rests on hue alone. Hover darkens the border. The label always reserves its semibold
 * width, so a chip never changes size when toggled.
 * The previous look: unselected chips in their tint (`CATEGORY_TINT_BG`), selected ones navy
 * (`CHIP.on.all` for every chip, with `<CategoryDot onFill>`).
 */
const CHIP = {
  // 36px to look at; the ::before stretches the touch target to 44px.
  base: 'relative inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm whitespace-nowrap transition-colors before:absolute before:inset-x-0 before:-inset-y-1 active:translate-y-px',
  off: 'border-border bg-surface font-medium text-text hover:border-border-strong',
  on: {
    all: 'border-primary bg-primary font-semibold text-on-primary',
    category: (color: CategoryColor) =>
      cn(CATEGORY_TINT_BG[color], CATEGORY_CHIP_BORDER[color], 'font-semibold text-text'),
  },
};

function Chip({
  pressed,
  color,
  onClick,
  children,
}: {
  pressed: boolean;
  color?: CategoryColor;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(CHIP.base, !pressed ? CHIP.off : color ? CHIP.on.category(color) : CHIP.on.all)}
    >
      {color && <CategoryDot color={color} />}
      {/* An invisible semibold copy sets the width; the visible label sits on top of it. */}
      <span className="inline-grid">
        <span aria-hidden="true" className="invisible col-start-1 row-start-1 font-semibold">
          {children}
        </span>
        <span className="col-start-1 row-start-1 text-center">{children}</span>
      </span>
    </button>
  );
}
