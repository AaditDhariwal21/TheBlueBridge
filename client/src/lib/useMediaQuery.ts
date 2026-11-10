import { useCallback, useSyncExternalStore } from 'react';

/** Breakpoints matching Tailwind's `sm` and `lg` (see tokens.css / Tailwind defaults). */
export const MEDIA = {
  sm: '(min-width: 40rem)',
  lg: '(min-width: 64rem)',
} as const;

/** Live `matchMedia` result. Correct on the first render (client-only app). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => {
        mql.removeEventListener('change', onChange);
      };
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
