import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { Container } from '../layout/Container';
import { Section } from '../layout/Section';
import { Reveal } from '../ui/Reveal';

interface Pillar {
  title: string;
  description: string;
  icon: ReactNode;
  tone: 'blue' | 'pink';
}

const PILLARS: Pillar[] = [
  {
    title: 'Connect',
    description: 'Meet women who share your roots, in your city and across the world.',
    tone: 'blue',
    icon: (
      <>
        <circle cx="5" cy="15" r="2.25" />
        <circle cx="19" cy="15" r="2.25" />
        <path d="M7 13.5Q12 6 17 13.5" />
      </>
    ),
  },
  {
    title: 'Learn',
    description: 'Draw on the experience of women who have walked the path before you.',
    tone: 'pink',
    icon: (
      <path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5Zm0 0V19" />
    ),
  },
  {
    title: 'Grow',
    description: 'Turn introductions into opportunities, and ambition into progress.',
    tone: 'blue',
    icon: (
      <>
        <circle cx="5" cy="18" r="1.75" />
        <circle cx="12" cy="12" r="1.75" />
        <circle cx="19" cy="6" r="1.75" />
        <path d="M6.4 16.8l4.2-3.6M13.4 10.8l4.2-3.6" />
      </>
    ),
  },
  {
    title: 'Pay Forward',
    description: 'Open doors for the women who come next.',
    tone: 'pink',
    icon: (
      <>
        <circle cx="5.5" cy="12" r="2.25" />
        <path d="M9 12h11M16 8l4 4-4 4" />
      </>
    ),
  },
];

export function Pillars() {
  return (
    <Section tone="surface" aria-labelledby="pillars-title">
      <Container>
        <h2 id="pillars-title" className="sr-only">
          Our pillars
        </h2>
        {/* gap-px over a border-coloured grid draws hairlines between cells at every breakpoint. */}
        <ul className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar, i) => (
            <li key={pillar.title} className="bg-surface">
              <Reveal delay={i * 90} className="flex h-full flex-col gap-4 p-6 sm:p-8">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn('size-8', pillar.tone === 'blue' ? 'text-accent' : 'text-accent-2')}
                >
                  {pillar.icon}
                </svg>
                <h3 className="mt-2 text-h3">{pillar.title}</h3>
                <p className="text-text-muted">{pillar.description}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
