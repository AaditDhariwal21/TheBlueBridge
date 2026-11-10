import { cn } from '../../lib/cn';
import { Container } from '../layout/Container';
import { Section } from '../layout/Section';
import { Reveal } from '../ui/Reveal';

const TITLE = 'Why the Blue Bridge';

const STORY = [
  'Jodhpur has produced an accomplished community of talented women whose careers and lives now span across Jodhpur, India and the rest of the world. Yet the professional ecosystem remains fragmented. There is no single, trusted, women-centric global ecosystem that brings them together.',
  'Existing organizations serve local needs, but there is no cohesive ecosystem that connects this powerful community across geographies and generations.',
  'And that matters. Because when these exceptional women know each other, share what they know, and are willing to help one another, individual strengths become collective power. Experiences can become guidance. Connections can become opportunities. Introductions can open doors. And one woman’s success can create a path for another.',
] as const;

/**
 * The About page's heading and the first three parts of the story. On wide
 * screens the heading stays pinned while the story scrolls beside it. The
 * parts are strung along a blue→pink line, like a bridge between two shores.
 */
export function AboutStory() {
  return (
    <Section aria-labelledby="page-title">
      <Container className="grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <h1 id="page-title" className="text-h1 tracking-tight motion-safe:animate-rise">
              {TITLE}
            </h1>
            <div
              aria-hidden="true"
              className="mt-6 h-px w-24 bg-linear-to-r from-accent-soft to-accent-2-soft"
            />
          </div>
        </div>

        <div className="relative max-w-reading lg:col-span-7">
          <div
            aria-hidden="true"
            className="absolute top-3 bottom-3 left-0 w-px bg-linear-to-b from-accent-soft to-accent-2-soft"
          />
          <div className="flex flex-col gap-10 sm:gap-12">
            {STORY.map((paragraph, i) => (
              <Reveal
                key={paragraph.slice(0, 24)}
                delay={i * 80}
                className="relative pl-8 sm:pl-12"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-2.5 left-0 size-2 -translate-x-1/2 rounded-full',
                    i === STORY.length - 1 ? 'bg-accent-2-soft' : 'bg-accent-soft',
                  )}
                />
                <p className={i === 0 ? 'text-body-lg text-text' : 'text-lg text-text-muted'}>
                  {paragraph}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
