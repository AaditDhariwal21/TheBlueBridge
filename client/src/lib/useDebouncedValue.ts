import { useEffect, useState } from 'react';

/** `value`, once it has stopped changing for `delayMs` (e.g. search-as-you-type). */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSettled(value);
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [value, delayMs]);
  return settled;
}
