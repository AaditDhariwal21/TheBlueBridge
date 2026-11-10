import { Suspense, useEffect, useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';

import { PageShell } from '../components/layout/PageShell';
import { applyHead } from './head';
import { findRoute, NOT_FOUND } from './routes';

export function RootLayout() {
  const { pathname, hash } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  // Compare against the previous path rather than a "first render" flag:
  // StrictMode re-runs effects in development, which defeats run-once flags.
  const previousPath = useRef(pathname);

  // A layout effect, so pages with data-specific titles (usePageHead) can
  // override the route's defaults in their own, later, passive effects.
  useLayoutEffect(() => {
    applyHead((findRoute(pathname) ?? NOT_FOUND).meta, pathname);
  }, [pathname]);

  useEffect(() => {
    // Client-side navigation: start at the top and move focus to <main> so
    // screen-reader and keyboard users land on the new page's content.
    // Not on initial load, so the skip link stays the first Tab stop.
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      mainRef.current?.focus({ preventScroll: true });
    }
  }, [pathname, hash]);

  return (
    <PageShell mainRef={mainRef}>
      <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
        <Outlet />
      </Suspense>
    </PageShell>
  );
}
