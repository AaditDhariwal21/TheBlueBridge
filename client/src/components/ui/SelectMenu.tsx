import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';

import { cn } from '../../lib/cn';

export interface SelectMenuOption<T extends string> {
  value: T;
  label: string;
}

interface SelectMenuProps<T extends string> {
  label: string;
  value: T;
  options: readonly SelectMenuOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

/**
 * A single-choice dropdown in the site's style (the browser's own option list can't be
 * themed). Underlined like <Input>; the options open in a square, hairline panel.
 * WAI-ARIA "select-only combobox" pattern: the button opens a listbox; arrows, Home/End and
 * Enter/Space pick, Escape or Tab closes, focus returns to the button.
 */
export function SelectMenu<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: SelectMenuProps<T>) {
  const id = useId();
  const labelId = `${id}-label`;
  const listId = `${id}-list`;
  const optionId = (index: number) => `${id}-option-${index}`;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [active, setActive] = useState(selectedIndex);
  const current = options[selectedIndex];

  const openList = () => {
    setActive(selectedIndex);
    setOpen(true);
  };
  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };
  const choose = (index: number) => {
    const option = options[index];
    if (option && option.value !== value) onChange(option.value);
    close(true);
  };

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  // Keep the active option in view while moving through a long list.
  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
  });

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      openList();
    }
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = options.length - 1;
    const moves: Partial<Record<string, number>> = {
      ArrowDown: Math.min(last, active + 1),
      ArrowUp: Math.max(0, active - 1),
      Home: 0,
      End: last,
    };
    const next = moves[event.key];
    if (next !== undefined) {
      event.preventDefault();
      setActive(next);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(active);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'Tab') {
      close(false);
    }
  };

  const onListClick = (event: MouseEvent<HTMLDivElement>) => {
    const item = (event.target as HTMLElement).closest<HTMLElement>('[data-index]');
    if (item) choose(Number(item.dataset.index));
  };

  return (
    <div ref={wrapperRef} className={cn('relative flex flex-col gap-1.5', className)}>
      <span id={labelId} className="text-sm text-text-muted">
        {label}
      </span>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={`${labelId} ${id}-value`}
        onClick={() => {
          if (open) close(true);
          else openList();
        }}
        onKeyDown={onButtonKeyDown}
        className="flex w-full items-center justify-between gap-2 border-0 border-b border-border-strong bg-transparent py-2.5 pr-1 pl-1 text-left text-base text-text transition-colors hover:border-text focus:border-text"
      >
        <span id={`${id}-value`} className="truncate">
          {current?.label}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className={cn(
            'size-4 shrink-0 text-text-muted transition-transform',
            open && 'rotate-180',
          )}
        >
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {open && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelId}
          aria-activedescendant={optionId(active)}
          onKeyDown={onListKeyDown}
          onClick={onListClick}
          className="absolute top-full right-0 left-0 z-30 mt-1 max-h-64 overflow-y-auto border border-border-strong bg-surface py-1 outline-none motion-safe:animate-sheet"
        >
          {options.map((option, index) => {
            const selected = index === selectedIndex;
            return (
              <div
                key={option.value}
                id={optionId(index)}
                role="option"
                tabIndex={-1}
                aria-selected={selected}
                data-index={index}
                onMouseEnter={() => {
                  setActive(index);
                }}
                className={cn(
                  'flex min-h-10 cursor-pointer items-center justify-between gap-3 px-3 text-sm',
                  index === active && 'bg-bg',
                  selected ? 'font-medium text-text' : 'text-text-muted',
                )}
              >
                {option.label}
                {selected && (
                  <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="size-3.5">
                    <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="1.75" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
