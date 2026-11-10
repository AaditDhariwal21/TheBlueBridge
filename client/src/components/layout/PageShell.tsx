import type { ReactNode, RefObject } from 'react';

import { Footer } from './Footer';
import { Header } from './Header';

interface PageShellProps {
  children: ReactNode;
  mainRef?: RefObject<HTMLElement | null>;
}

export const MAIN_ID = 'main';

export function PageShell({ children, mainRef }: PageShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href={`#${MAIN_ID}`}
        // Paper-on-navy so it stands out against the header when it appears.
        className="fixed top-3 left-3 z-50 -translate-y-24 bg-bg px-4 py-3 text-sm font-medium text-text transition-transform focus-visible:translate-y-0"
      >
        Skip to content
      </a>
      <Header />
      <main id={MAIN_ID} ref={mainRef} tabIndex={-1} className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
