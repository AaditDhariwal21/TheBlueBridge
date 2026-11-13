import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../../lib/cn';
import {
  DEFAULT_DURATION,
  ToastContext,
  type Toast,
  type ToastApi,
  type ToastOptions,
  type ToastVariant,
} from './toast';

/** At most this many on screen; the rest wait their turn, oldest first. */
const MAX_VISIBLE = 3;
/** Matches --animate-toast-out (--duration-fast), with a little slack. */
const EXIT_MS = 180;

/** Full class names, so Tailwind finds them. */
const VARIANT_STYLE: Record<
  ToastVariant,
  { rule: string; bar: string; icon: string; label: string }
> = {
  success: { rule: 'border-l-success', bar: 'bg-success', icon: 'text-success', label: 'Success' },
  error: { rule: 'border-l-danger', bar: 'bg-danger', icon: 'text-danger', label: 'Error' },
  warning: { rule: 'border-l-warning', bar: 'bg-warning', icon: 'text-warning', label: 'Warning' },
  info: { rule: 'border-l-accent', bar: 'bg-accent', icon: 'text-accent', label: 'Note' },
};

type Entry = Toast & { leaving: boolean };

/**
 * Toast notifications for the whole app: `useToast()` anywhere below this provider.
 * Toasts appear at the top centre on phones and the top right from `sm`, under the header.
 * Screen readers hear each one through a polite live region (errors: an assertive one),
 * which always exists, so announcements are reliable.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const nextId = useRef(0);

  const remove = useCallback((id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      setEntries((current) =>
        current.map((entry) => (entry.id === id ? { ...entry, leaving: true } : entry)),
      );
      window.setTimeout(() => {
        remove(id);
      }, EXIT_MS);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(() => {
    const show = (variant: ToastVariant, message: string, options: ToastOptions = {}) => {
      nextId.current += 1;
      const id = `toast-${nextId.current}`;
      const toast: Entry = {
        ...options,
        id,
        variant,
        message,
        duration: options.duration ?? DEFAULT_DURATION[variant],
        leaving: false,
      };
      setEntries((current) => [...current, toast]);
      return id;
    };
    return {
      show,
      success: (message, options) => show('success', message, options),
      error: (message, options) => show('error', message, options),
      info: (message, options) => show('info', message, options),
      warning: (message, options) => show('warning', message, options),
      dismiss,
    };
  }, [dismiss]);

  const visible = entries.slice(0, MAX_VISIBLE);

  return (
    <ToastContext value={api}>
      {children}
      {createPortal(
        <>
          {/* Always mounted, so adding text to them is announced. */}
          <div role="status" aria-live="polite" className="sr-only">
            {visible
              .filter((t) => t.variant !== 'error')
              .map((t) => (
                <p key={t.id}>{announcement(t)}</p>
              ))}
          </div>
          <div role="alert" aria-live="assertive" className="sr-only">
            {visible
              .filter((t) => t.variant === 'error')
              .map((t) => (
                <p key={t.id}>{announcement(t)}</p>
              ))}
          </div>
          {visible.length > 0 && (
            <section
              aria-label="Notifications"
              className="pointer-events-none fixed inset-x-0 top-[calc(var(--spacing-header)+0.5rem)] z-50 flex flex-col items-center gap-2 px-gutter sm:inset-x-auto sm:right-0 sm:items-end"
            >
              <ol className="flex w-full flex-col gap-2 sm:w-96">
                {visible.map((toast) => (
                  <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
                ))}
              </ol>
            </section>
          )}
        </>,
        document.body,
      )}
    </ToastContext>
  );
}

function announcement(toast: Toast): string {
  return [toast.title, toast.message].filter(Boolean).join('. ');
}

function ToastItem({ toast, onDismiss }: { toast: Entry; onDismiss: (id: string) => void }) {
  const { id, duration, leaving } = toast;
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  const remaining = useRef(duration);
  const itemRef = useRef<HTMLLIElement>(null);
  const style = VARIANT_STYLE[toast.variant];

  // Hovering, or focus inside (keyboard users reaching its buttons), pauses the timer.
  // Escape anywhere inside the toast dismisses it.
  useEffect(() => {
    const item = itemRef.current;
    if (!item) return;
    const enter = () => {
      setHovered(true);
    };
    const leave = () => {
      setHovered(false);
    };
    const focusIn = () => {
      setFocused(true);
    };
    const focusOut = (event: FocusEvent) => {
      if (!item.contains(event.relatedTarget as Node | null)) setFocused(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onDismiss(id);
    };
    item.addEventListener('mouseenter', enter);
    item.addEventListener('mouseleave', leave);
    item.addEventListener('focusin', focusIn);
    item.addEventListener('focusout', focusOut);
    item.addEventListener('keydown', escape);
    return () => {
      item.removeEventListener('mouseenter', enter);
      item.removeEventListener('mouseleave', leave);
      item.removeEventListener('focusin', focusIn);
      item.removeEventListener('focusout', focusOut);
      item.removeEventListener('keydown', escape);
    };
  }, [id, onDismiss]);

  // Counts down only while visible and not paused; pausing keeps what is left.
  useEffect(() => {
    if (duration === 0 || paused || leaving) return;
    const startedAt = Date.now();
    const timer = window.setTimeout(() => {
      onDismiss(id);
    }, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - startedAt;
    };
  }, [id, duration, paused, leaving, onDismiss]);

  return (
    <li
      ref={itemRef}
      className={cn(
        'pointer-events-auto relative flex items-start gap-3 overflow-hidden border border-l-2 border-border bg-surface py-3 pr-2 pl-3 text-text',
        style.rule,
        leaving ? 'animate-toast-out' : 'motion-safe:animate-toast-in',
      )}
    >
      <ToastIcon variant={toast.variant} className={cn('mt-0.5', style.icon)} />
      <div className="min-w-0 flex-1 py-0.5 text-sm">
        <span className="sr-only">{style.label}: </span>
        {toast.title && <p className="font-medium">{toast.title}</p>}
        <p className={cn('wrap-break-word', toast.title && 'text-text-muted')}>{toast.message}</p>
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss(id);
            }}
            className="mt-2 min-h-8 text-sm font-medium text-accent underline decoration-accent-soft underline-offset-4 hover:decoration-accent"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          onDismiss(id);
        }}
        aria-label="Dismiss notification"
        className="-my-1 grid size-9 shrink-0 place-items-center text-text-muted transition-colors hover:text-text"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none">
          <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {duration > 0 && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-x-0 bottom-0 h-0.5 origin-left animate-toast-progress motion-reduce:hidden',
            style.bar,
          )}
          style={
            {
              animationDuration: `${duration}ms`,
              animationPlayState: paused || leaving ? 'paused' : 'running',
            } satisfies CSSProperties
          }
        />
      )}
    </li>
  );
}

function ToastIcon({ variant, className }: { variant: ToastVariant; className: string }) {
  const paths: Record<ToastVariant, ReactNode> = {
    success: <path d="m8 12.5 2.5 2.5L16 9.5" />,
    error: <path d="M9 9l6 6M15 9l-6 6" />,
    warning: <path d="M12 8v4.5M12 15.5v.5" />,
    info: <path d="M12 11v5M12 8v.5" />,
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-5 shrink-0', className)}
    >
      <circle cx="12" cy="12" r="8.5" />
      {paths[variant]}
    </svg>
  );
}
