import { useId, type Ref } from 'react';

import { Button } from '../../../../components/ui/Button';
import { CategoryDot } from '../../../../components/ui/CategoryDot';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { cn } from '../../../../lib/cn';
import type { Category } from '../../model/types';

interface CategoryChoiceProps {
  legend: string;
  hint?: string;
  /** The categories to offer, or the loading state of the list. */
  options: Category[] | 'loading' | 'error';
  onRetry: () => void;
  /** `multiple`: checkboxes, any number. `single`: radios, exactly one. */
  mode: 'multiple' | 'single';
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string | undefined;
  /** The first option's input, so a form can move focus here on error. */
  firstRef?: Ref<HTMLInputElement>;
}

/** Category chips with colour dots, shared by both composers. Native inputs throughout. */
export function CategoryChoice({
  legend,
  hint,
  options,
  onRetry,
  mode,
  value,
  onChange,
  error,
  firstRef,
}: CategoryChoiceProps) {
  const name = useId();
  const hintId = useId();
  const errorId = useId();
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;

  const toggle = (id: string) => {
    if (mode === 'single') onChange([id]);
    else onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <fieldset aria-describedby={describedBy} aria-busy={options === 'loading' || undefined}>
      <legend className="text-sm text-text-muted">{legend}</legend>
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-text-subtle">
          {hint}
        </p>
      )}

      {options === 'loading' && (
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="sr-only">Loading categories…</span>
          {['w-20', 'w-24', 'w-16', 'w-36', 'w-20'].map((width, i) => (
            <Skeleton key={i} className={cn('h-11', width)} />
          ))}
        </div>
      )}

      {options === 'error' && (
        <div role="alert" className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-danger">The categories couldn’t be loaded.</span>
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}

      {Array.isArray(options) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {options.map((category, i) => {
            const checked = value.includes(category.id);
            return (
              <label key={category.id} className="relative">
                <input
                  ref={i === 0 ? firstRef : undefined}
                  type={mode === 'single' ? 'radio' : 'checkbox'}
                  name={name}
                  value={category.id}
                  checked={checked}
                  onChange={() => {
                    toggle(category.id);
                  }}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    'inline-flex min-h-11 cursor-pointer items-center gap-2 border px-3 text-sm transition-colors',
                    'border-border bg-surface text-text-muted hover:border-border-strong hover:text-text',
                    'peer-checked:border-primary peer-checked:bg-primary peer-checked:text-on-primary',
                    // Hovering a selected chip must not undo its selected colours.
                    'peer-checked:hover:border-primary peer-checked:hover:text-on-primary',
                    'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
                    error && 'border-danger',
                  )}
                >
                  <CategoryDot color={category.color} onFill={checked} />
                  {category.name}
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
