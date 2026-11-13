import { useId } from 'react';

import { CategoryDot } from './CategoryDot';
import { FilterMenu, type FilterMenuProps } from './FilterMenu';

interface SearchFilterBarProps {
  /** Names the search landmark, e.g. "Blogs". */
  label: string;
  /** The search box's label and placeholder, e.g. "Search blogs". */
  placeholder: string;
  /** Read to screen-reader users, e.g. how results update. */
  hint: string;
  maxLength: number;
  query: string;
  onQueryChange: (query: string) => void;
  filter: FilterMenuProps;
}

/**
 * A search box with a filter menu beside it, then the active filters as removable pills.
 * The Feed and the member directory share it, so both search and filter the same way.
 */
export function SearchFilterBar({
  label,
  placeholder,
  hint,
  maxLength,
  query,
  onQueryChange,
  filter,
}: SearchFilterBarProps) {
  const inputId = useId();
  const hintId = useId();
  const selected = Array.isArray(filter.options)
    ? filter.options.filter((option) => filter.value.includes(option.id))
    : [];

  return (
    <div>
      <div role="search" aria-label={label} className="flex items-stretch gap-2">
        <div className="relative min-w-0 flex-1">
          <label htmlFor={inputId} className="sr-only">
            {placeholder}
          </label>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="m20 20-4.5-4.5" />
          </svg>
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(event) => {
              onQueryChange(event.target.value);
            }}
            placeholder={placeholder}
            aria-describedby={hintId}
            maxLength={maxLength}
            autoComplete="off"
            enterKeyHint="search"
            className="min-h-11 w-full border border-border-strong bg-surface py-2 pr-3 pl-9 text-base text-text transition-colors placeholder:text-text-subtle hover:border-text focus:border-text"
          />
          <span id={hintId} className="sr-only">
            {hint}
          </span>
        </div>
        <FilterMenu {...filter} />
      </div>

      {selected.length > 0 && (
        <ul aria-label="Active filters" className="mt-3 flex flex-wrap gap-2">
          {selected.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => {
                  filter.onChange(filter.value.filter((id) => id !== option.id));
                }}
                className="inline-flex min-h-8 items-center gap-1.5 border border-border bg-surface px-2 text-xs text-text-muted transition-colors hover:border-border-strong hover:text-text"
              >
                {option.color && <CategoryDot color={option.color} />}
                {option.label}
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-3.5">
                  <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <span className="sr-only">, remove this filter</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
