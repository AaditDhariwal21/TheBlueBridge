import type { ReactNode } from 'react';

import { Container } from '../layout/Container';
import { Section } from '../layout/Section';

interface PageIntroProps {
  title: string;
  /** Optional visual shown beside the title on wide screens, below it on narrow ones. */
  aside?: ReactNode;
}

/** Top-of-page band for inner pages: the page's single h1. */
export function PageIntro({ title, aside }: PageIntroProps) {
  return (
    <Section aria-labelledby="page-title" className="pb-0">
      <Container className="grid items-end gap-10 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <h1 id="page-title" className="text-h1 tracking-tight motion-safe:animate-rise">
            {title}
          </h1>
          <div
            aria-hidden="true"
            className="mt-6 h-px w-24 bg-linear-to-r from-accent-soft to-accent-2-soft"
          />
        </div>
        {aside && <div className="lg:col-span-6">{aside}</div>}
      </Container>
    </Section>
  );
}
