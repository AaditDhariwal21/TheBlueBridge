import type { ReactNode } from 'react';

import { Container } from '../../../components/layout/Container';
import { Section } from '../../../components/layout/Section';
import { Card } from '../../../components/ui/Card';

interface AuthShellProps {
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  /** Shown under the card, e.g. "New here? Create an account". */
  footer?: ReactNode;
  /** Further sections after the card (e.g. the account's activity). */
  after?: ReactNode;
  children: ReactNode;
}

/** The shared frame for sign-in, sign-up and account pages: page h1, then one card. */
export function AuthShell({ eyebrow, title, intro, footer, after, children }: AuthShellProps) {
  return (
    <Section aria-labelledby="page-title" className="py-12 sm:py-section">
      <Container width="narrow">
        <header>
          <p className="text-xs tracking-caps text-text-muted uppercase">{eyebrow}</p>
          <h1 id="page-title" className="mt-2 text-h1 tracking-tight motion-safe:animate-rise">
            {title}
          </h1>
          {intro && <div className="mt-3 text-text-muted">{intro}</div>}
          <div
            aria-hidden="true"
            className="mt-6 h-px w-24 bg-linear-to-r from-accent-soft to-accent-2-soft"
          />
        </header>
        <Card accent="blue" className="mt-8">
          {children}
        </Card>
        {footer && <div className="mt-6 text-center text-sm text-text-muted">{footer}</div>}
        {after}
      </Container>
    </Section>
  );
}
