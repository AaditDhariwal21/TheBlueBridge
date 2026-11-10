import { Container } from '../layout/Container';
import { Section } from '../layout/Section';
import { Reveal } from '../ui/Reveal';

const PROBLEM = ['Talent exists.', 'Experience exists.', 'Opportunity exists.'] as const;
const MISSING = 'Connection is missing.';

const MISSION =
  'To build a trusted community of professional women with Jodhpur roots and unlock the power of what we collectively bring—our talent, knowledge, experience, and connections—to empower each other, create opportunities, and amplify our impact, while opening doors for the women who come next.';

/** Problem statement (as the heading) followed by the mission paragraph. */
export function Mission() {
  return (
    <Section aria-labelledby="mission-title">
      <Container>
        <Reveal>
          <h2 id="mission-title" className="text-display tracking-tight">
            {PROBLEM.map((line) => (
              <span key={line} className="block">
                {line}{' '}
              </span>
            ))}
            <span className="block text-accent italic">{MISSING}</span>
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-8 sm:mt-16 lg:grid-cols-12">
          {/* A small "bridge" between the two accents: decorative only. */}
          <div aria-hidden="true" className="flex h-8 items-center gap-2 lg:col-span-4">
            <span className="size-2 rounded-full bg-accent-soft" />
            <span className="h-px w-24 bg-linear-to-r from-accent-soft to-accent-2-soft" />
            <span className="size-2 rounded-full bg-accent-2-soft" />
          </div>
          <Reveal className="lg:col-span-8" delay={100}>
            <p className="max-w-reading text-body-lg text-text-muted">{MISSION}</p>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
