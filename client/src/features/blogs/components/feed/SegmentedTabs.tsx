import { useRef, type KeyboardEvent } from 'react';

import { cn } from '../../../../lib/cn';
import { panelId, tabId } from './tabIds';

export interface SegmentedTab<T extends string> {
  id: T;
  label: string;
}

interface SegmentedTabsProps<T extends string> {
  tabs: readonly SegmentedTab<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  /** Prefix for tab/panel ids: `${idPrefix}-tab-${id}` and `${idPrefix}-panel-${id}`. */
  idPrefix: string;
}

/**
 * WAI-ARIA tabs styled as a segmented control, with a sliding indicator.
 * Roving tabindex; ←/→ (wrapping), Home and End move and select.
 */
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  idPrefix,
}: SegmentedTabsProps<T>) {
  const refs = useRef(new Map<T, HTMLButtonElement>());
  const index = Math.max(
    0,
    tabs.findIndex((t) => t.id === value),
  );

  const select = (next: number) => {
    const tab = tabs[(next + tabs.length) % tabs.length];
    if (!tab) return;
    onChange(tab.id);
    refs.current.get(tab.id)?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const moves: Partial<Record<string, number>> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(next);
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className="relative grid border border-border-strong bg-surface p-0.5"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0.5 left-0.5 bg-primary transition-transform duration-(--duration-base) ease-out"
        style={{
          width: `calc((100% - 0.25rem) / ${tabs.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) refs.current.set(tab.id, el);
              else refs.current.delete(tab.id);
            }}
            id={tabId(idPrefix, tab.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId(idPrefix, tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              onChange(tab.id);
            }}
            onKeyDown={handleKeyDown}
            className={cn(
              'relative z-10 min-h-11 px-3 text-sm font-medium transition-colors duration-(--duration-base)',
              selected ? 'text-on-primary' : 'text-text-muted hover:text-text',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
