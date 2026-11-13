import type { ReactNode } from 'react';

import { Container } from '../layout/Container';
import { Section } from '../layout/Section';

interface PageIntroProps {
  title: string;
  /** Optional visual shown beside the title on wide screens, below it on narrow ones. */
  aside?: ReactNode;
}

/**
 * Top-of-page band for inner pages: the page's single h1. Compact, so the page's main
 * content (on Community, the member directory) starts within the first screen.
 */
export function PageIntro({ title, aside }: PageIntroProps) {
  return (
    <Section aria-labelledby="page-title" spacing="none" className="pt-10 sm:pt-14">
      <Container className="grid items-end gap-6 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7">
          <h1 id="page-title" className="text-h2 tracking-tight motion-safe:animate-rise">
            {title}
          </h1>
          <div
            aria-hidden="true"
            className="mt-5 h-px w-24 bg-linear-to-r from-accent-soft to-accent-2-soft"
          />
        </div>
        {aside && <div className="max-w-narrow lg:col-span-5 lg:max-w-none">{aside}</div>}
      </Container>
    </Section>
  );
}
