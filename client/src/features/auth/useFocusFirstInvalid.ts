import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * After a failed submit, moves focus to the first control marked invalid inside
 * the container, once React has rendered the errors. Radios can't carry
 * aria-invalid, so they are marked with data-invalid instead.
 */
export function useFocusFirstInvalid<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [request, setRequest] = useState(0);

  useEffect(() => {
    if (request === 0) return;
    ref.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid]')?.focus();
  }, [request]);

  const focusFirstInvalid = useCallback(() => {
    setRequest((n) => n + 1);
  }, []);

  return [ref, focusFirstInvalid] as const;
}
