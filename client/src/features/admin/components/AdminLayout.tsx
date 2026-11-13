import type { ReactNode } from 'react';
import { NavLink } from 'react-router';

import { Container } from '../../../components/layout/Container';
import { ADMIN_SECTIONS } from '../paths';

/**
 * The admin panel's frame: a sticky section sidebar from `lg`; below that, a compact
 * row of section tabs that sticks under the header and scrolls sideways if it must.
 */
export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Container className="pt-8 pb-16 sm:pt-12 lg:pb-24">
      <header>
        <p className="text-xs tracking-caps text-text-muted uppercase">Admin</p>
        <h1 id="page-title" className="mt-2 text-h1 tracking-tight motion-safe:animate-rise">
          Admin panel
        </h1>
        <div
          aria-hidden="true"
          className="mt-6 h-px w-24 bg-linear-to-r from-accent-soft to-accent-2-soft"
        />
      </header>

      <div className="mt-6 lg:mt-10 lg:grid lg:grid-cols-12 lg:gap-10">
        <nav
          aria-label="Admin panel sections"
          className="sticky top-header z-20 -mx-gutter bg-bg px-gutter lg:static lg:col-span-3 lg:mx-0 lg:px-0"
        >
          <ul className="flex overflow-x-auto border-b border-border lg:sticky lg:top-24 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-l">
            {ADMIN_SECTIONS.map((section) => (
              <li key={section.to} className="shrink-0">
                <NavLink
                  to={section.to}
                  end={section.end}
                  className="-mb-px flex min-h-11 items-center border-b-2 border-transparent px-3 text-sm whitespace-nowrap text-text-muted transition-colors hover:text-text aria-[current=page]:border-primary aria-[current=page]:font-medium aria-[current=page]:text-text lg:mb-0 lg:-ml-px lg:border-b-0 lg:border-l-2 lg:px-4"
                >
                  {section.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-8 min-w-0 lg:col-span-9 lg:mt-0">{children}</div>
      </div>
    </Container>
  );
}
