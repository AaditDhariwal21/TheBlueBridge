import { cn } from '../../lib/cn';
import { Container } from '../layout/Container';
import { Section } from '../layout/Section';
import { Card } from '../ui/Card';
import { Reveal } from '../ui/Reveal';

interface Audience {
  title: string;
  description: string;
  accent: 'blue' | 'pink';
}

const AUDIENCES: Audience[] = [
  {
    title: 'Professional women',
    description:
      'Women currently working in a professional capacity — corporate professionals, entrepreneurs, business owners or independent professionals. They may be looking for connections for growth themselves or open to mentoring and guiding others.',
    accent: 'blue',
  },
  {
    title: 'Aspiring & emerging women',
    description:
      'Women looking to enter, re-enter or advance in the workforce — including college students, young professionals and mid-career women transitioning back into work.',
    accent: 'pink',
  },
];

/** The two audiences, colour-coded to the two figures in the bridge artwork. */
export function Audiences() {
  return (
    <Section>
      <Container>
        <ol className="grid gap-6 md:grid-cols-2 md:gap-8">
          {AUDIENCES.map((audience, i) => (
            <li key={audience.title}>
              <Reveal delay={i * 100} className="h-full">
                <Card accent={audience.accent} className="h-full">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'block font-display text-numeral',
                      audience.accent === 'blue' ? 'text-accent' : 'text-accent-2',
                    )}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h2 className="mt-6 text-h3 sm:text-h2">{audience.title}</h2>
                  <p className="mt-4 text-lg text-text-muted">{audience.description}</p>
                </Card>
              </Reveal>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
