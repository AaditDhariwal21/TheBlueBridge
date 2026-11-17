import { Suspense, useEffect, useLayoutEffect, useRef } from 'react';
import { NavigationType, Outlet, useLocation, useNavigationType } from 'react-router';

import { PageShell } from '../components/layout/PageShell';
import { applyHead } from './head';
import { findRoute, NOT_FOUND } from './routes';

/** Scroll position of each history entry (by location key), for back and forward. */
const scrollByEntry = new Map<string, number>();

export function RootLayout() {
  const { pathname, hash, key } = useLocation();
  const navigationType = useNavigationType();
  const mainRef = useRef<HTMLElement>(null);
  // Compare against the previous path rather than a "first render" flag:
  // StrictMode re-runs effects in development, which defeats run-once flags.
  const previousPath = useRef(pathname);
  const currentKey = useRef(key);

  // A layout effect, so pages with data-specific titles (usePageHead) can
  // override the route's defaults in their own, later, passive effects.
  useLayoutEffect(() => {
    applyHead((findRoute(pathname) ?? NOT_FOUND).meta, pathname);
  }, [pathname]);

  // Remember where each history entry was scrolled to (the app restores positions itself).
  // Recorded once per frame, under the entry this layout has committed.
  useLayoutEffect(() => {
    currentKey.current = key;
  }, [key]);
  useEffect(() => {
    window.history.scrollRestoration = 'manual';
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        scrollByEntry.set(currentKey.current, window.scrollY);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    // Client-side navigation to a new page: start at the top, or, going back or forward,
    // where the reader left it. Focus moves to <main> so screen-reader and keyboard users
    // land on the new page's content. Not on initial load, so the skip link stays the
    // first Tab stop.
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    if (hash) return;
    const saved = navigationType === NavigationType.Pop ? scrollByEntry.get(key) : undefined;
    window.scrollTo({ top: saved ?? 0, behavior: 'instant' });
    mainRef.current?.focus({ preventScroll: true });
    if (saved === undefined) return;
    // Once more after the next paint, in case the page grew as it rendered.
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: saved, behavior: 'instant' });
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [pathname, hash, key, navigationType]);

  return (
    <PageShell mainRef={mainRef}>
      <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
        <Outlet />
      </Suspense>
    </PageShell>
  );
}
