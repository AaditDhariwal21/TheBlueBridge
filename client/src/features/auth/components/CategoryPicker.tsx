import { useId } from 'react';

import { Button } from '../../../components/ui/Button';
import { CategoryDot } from '../../../components/ui/CategoryDot';
import { Skeleton } from '../../../components/ui/Skeleton';
import { cn } from '../../../lib/cn';
import { useCategories } from '../../categories/useCategories';
import { MAX_CATEGORIES } from '../validation';

interface CategoryPickerProps {
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string | undefined;
}

/**
 * An ambassador's categories: checkbox chips with each category's colour dot,
 * at most two. Once two are chosen the rest are disabled, and a polite live
 * region says so.
 */
export function CategoryPicker({ value, onChange, error }: CategoryPickerProps) {
  const load = useCategories();
  const hintId = useId();
  const errorId = useId();

  const full = value.length >= MAX_CATEGORIES;
  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <fieldset
      aria-describedby={cn(hintId, error && errorId)}
      aria-busy={load.status === 'loading' || undefined}
    >
      <legend className="text-sm text-text-muted">Your categories</legend>
      <p id={hintId} aria-live="polite" className="mt-1 text-xs text-text-subtle">
        Choose one or two. {value.length} of {MAX_CATEGORIES} chosen
        {full && '; unselect one to choose another'}.
      </p>

      {load.status === 'loading' && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="sr-only">Loading categories…</span>
          {['w-24', 'w-20', 'w-28', 'w-36', 'w-20'].map((width, i) => (
            <Skeleton key={i} className={cn('h-11', width)} />
          ))}
        </div>
      )}

      {load.status === 'error' && (
        <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-danger">The categories couldn’t be loaded.</span>
          <Button variant="outline" onClick={load.retry}>
            Try again
          </Button>
        </div>
      )}

      {load.status === 'ready' && load.categories.length === 0 && (
        <p className="mt-3 text-sm text-text-muted">
          No categories are open yet. Join as a member for now; you can become an ambassador later.
        </p>
      )}

      {load.status === 'ready' && load.categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {load.categories.map((category) => {
            const checked = value.includes(category.id);
            const disabled = full && !checked;
            return (
              <label key={category.id} className="relative">
                <input
                  type="checkbox"
                  name="categoryIds"
                  value={category.id}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => {
                    toggle(category.id);
                  }}
                  aria-invalid={error ? true : undefined}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    'inline-flex min-h-11 items-center gap-2 border px-3 text-sm transition-colors',
                    'border-border bg-surface text-text',
                    'peer-checked:border-primary peer-checked:bg-primary peer-checked:text-on-primary',
                    'peer-checked:hover:border-primary',
                    'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
                    disabled
                      ? 'cursor-not-allowed opacity-50'
                      : 'cursor-pointer hover:border-border-strong',
                    error && 'border-danger',
                  )}
                >
                  <CategoryDot color={category.color} onFill={checked} />
                  {category.name}
                  {checked && (
                    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none">
                      <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.75" />
                    </svg>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {error && (
        <p id={errorId} className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
