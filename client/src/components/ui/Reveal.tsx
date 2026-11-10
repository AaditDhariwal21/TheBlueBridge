import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { cn } from '../../lib/cn';

interface RevealProps {
  children: ReactNode;
  /** Stagger, in ms. */
  delay?: number;
  className?: string;
}

/**
 * Fades and lifts its content into view once, the first time it enters the
 * viewport. The hidden state only exists under `prefers-reduced-motion:
 * no-preference` (see index.css), so reduced-motion users see content at once.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'hidden' | 'shown' | 'instant'>('hidden');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState((s) => (s === 'hidden' ? 'shown' : s));
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={state}
      // Keyboard users may tab into content before it has scrolled into view:
      // show it at once, without the transition, so focus is never invisible.
      onFocusCapture={() => {
        setState((s) => (s === 'hidden' ? 'instant' : s));
      }}
      style={delay ? ({ '--reveal-delay': `${delay}ms` } as CSSProperties) : undefined}
      className={cn(className)}
    >
      {children}
    </div>
  );
}
