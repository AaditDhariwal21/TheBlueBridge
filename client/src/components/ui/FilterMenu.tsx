import { useEffect, useId, useRef, useState } from 'react';

import type { CategoryColor } from '../../lib/categoryColor';
import { cn } from '../../lib/cn';
import { MEDIA, useMediaQuery } from '../../lib/useMediaQuery';
import { Button } from './Button';
import { CategoryDot } from './CategoryDot';
import { Dialog } from './Dialog';
import { DialogHeader } from './DialogHeader';
import { Skeleton } from './Skeleton';

export interface FilterOption {
  id: string;
  label: string;
  /** A category's colour, shown as its dot. */
  color?: CategoryColor;
}

export interface FilterMenuProps {
  /** The button's text from `sm` up, e.g. "Filter by category". */
  label: string;
  /** The button's text on phones, e.g. "Filter". */
  shortLabel: string;
  /** Heading of the list, e.g. "Categories". */
  title: string;
  options: FilterOption[] | 'loading' | 'error';
  onRetry: () => void;
  value: string[];
  onChange: (ids: string[]) => void;
  /** At most this many can be ticked. */
  max?: number;
}

/**
 * A multi-select filter (a match on any ticked option). A compact checklist popover under
 * the button from `sm` up, a bottom sheet on phones. Whole rows are the click targets;
 * changes apply at once. The button shows how many are active.
 */
export function FilterMenu(props: FilterMenuProps) {
  const { label, shortLabel, value } = props;
  const isDesktop = useMediaQuery(MEDIA.sm);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const headingId = useId();
  const count = value.length;

  // The popover closes on Escape, a click outside, or Tab moving focus out of it.
  useEffect(() => {
    if (!open || !isDesktop) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onFocusOut = (event: FocusEvent) => {
      if (!wrapper.contains(event.relatedTarget as Node | null)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    wrapper.addEventListener('keydown', onKeyDown);
    wrapper.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      wrapper.removeEventListener('keydown', onKeyDown);
      wrapper.removeEventListener('focusout', onFocusOut);
    };
  }, [open, isDesktop]);

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-controls={isDesktop ? panelId : undefined}
        aria-haspopup={isDesktop ? undefined : 'dialog'}
        className={cn(
          'inline-flex min-h-11 items-center gap-2 border px-3 text-sm font-medium transition-colors',
          count > 0
            ? 'border-primary bg-primary text-on-primary'
            : 'border-border-strong bg-surface text-text hover:border-text',
        )}
      >
        <FunnelIcon />
        <span className="sm:hidden">{shortLabel}</span>
        <span className="hidden sm:inline">{label}</span>
        {count > 0 && (
          <span className="grid min-w-5 place-items-center bg-on-primary px-1 text-xs text-primary">
            {count}
            <span className="sr-only"> active</span>
          </span>
        )}
      </button>

      {isDesktop ? (
        open && (
          // Focusable (but not a Tab stop), so a click on a row's text keeps focus in here
          // instead of moving it to <main>, which would read as leaving and close the menu.
          <div
            id={panelId}
            tabIndex={-1}
            className="absolute top-full right-0 z-30 mt-1 w-60 border border-border-strong bg-surface py-2 outline-none motion-safe:animate-sheet"
          >
            <OptionList {...props} />
          </div>
        )
      ) : (
        <Dialog
          open={open}
          onClose={() => {
            setOpen(false);
          }}
          labelledBy={headingId}
        >
          <DialogHeader
            id={headingId}
            title={label}
            onClose={() => {
              setOpen(false);
            }}
          />
          <div className="overflow-y-auto overscroll-contain py-3">
            <OptionList {...props} large />
          </div>
          <div className="shrink-0 border-t border-border px-gutter py-3">
            <Button
              className="w-full"
              onClick={() => {
                setOpen(false);
              }}
            >
              Show results
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function OptionList({
  title,
  options,
  onRetry,
  value,
  onChange,
  max,
  large = false,
}: FilterMenuProps & { large?: boolean }) {
  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };
  const pad = large ? 'px-gutter' : 'px-3';

  return (
    <fieldset aria-busy={options === 'loading' || undefined}>
      <legend className="sr-only">{title}</legend>
      <div className={cn('flex min-h-8 items-center justify-between gap-3', pad)}>
        <span aria-hidden="true" className="text-xs tracking-caps text-text-muted uppercase">
          {title}
        </span>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => {
              onChange([]);
            }}
            className="text-xs text-text-muted underline-offset-4 hover:text-text hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {options === 'loading' && (
        <div className={cn('flex flex-col gap-3 py-2', pad)}>
          <span className="sr-only">Loading…</span>
          {['w-24', 'w-20', 'w-28'].map((width) => (
            <Skeleton key={width} className={cn('h-4', width)} />
          ))}
        </div>
      )}
      {options === 'error' && (
        <div role="alert" className={cn('flex flex-col items-start gap-2 py-2 text-sm', pad)}>
          <span className="text-danger">The list couldn’t be loaded.</span>
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
      {Array.isArray(options) && (
        <ul className="mt-1">
          {options.map((option) => {
            const checked = value.includes(option.id);
            const full = !checked && max !== undefined && value.length >= max;
            return (
              <li key={option.id}>
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-3 text-sm transition-colors select-none hover:bg-bg',
                    'has-[input:focus-visible]:bg-bg has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-2 has-[input:focus-visible]:outline-focus',
                    large ? 'min-h-12' : 'min-h-10',
                    full && 'cursor-not-allowed opacity-50',
                    pad,
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={full}
                    onChange={() => {
                      toggle(option.id);
                    }}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid size-4 shrink-0 place-items-center border transition-colors',
                      checked
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-border-strong',
                    )}
                  >
                    {checked && (
                      <svg viewBox="0 0 16 16" fill="none" className="size-3">
                        <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="1.75" />
                      </svg>
                    )}
                  </span>
                  {option.color && <CategoryDot color={option.color} />}
                  <span className={cn(checked ? 'font-medium text-text' : 'text-text-muted')}>
                    {option.label}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </fieldset>
  );
}

function FunnelIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      className="size-4 shrink-0"
    >
      <path d="M4 5h16l-6 7.5V19l-4-2v-4.5L4 5Z" />
    </svg>
  );
}
