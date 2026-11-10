import { PLACEHOLDER_HREF } from '../../app/site';
import { Container } from '../layout/Container';
import { Section } from '../layout/Section';
import { Constellation } from '../ui/Constellation';
import { Reveal } from '../ui/Reveal';
import { WaitlistForm } from './WaitlistForm';

export function WaitlistCta() {
  return (
    <Section tone="inverse" aria-labelledby="waitlist-title" className="overflow-hidden">
      <Constellation />
      <Container className="text-center">
        <Reveal>
          <h2 id="waitlist-title" className="text-h2">
            Connection. Community. Confluence.
          </h2>
          <p className="mx-auto mt-4 max-w-reading text-text-muted">
            Ready to join?{' '}
            <a
              href={PLACEHOLDER_HREF.createAccount}
              className="text-text underline decoration-accent-2-soft underline-offset-4 transition-colors hover:decoration-text"
            >
              Create your account
            </a>
            . Not ready yet? Leave your details and we’ll keep you posted.
          </p>
        </Reveal>
        <Reveal delay={120} className="mt-10">
          <WaitlistForm />
        </Reveal>
      </Container>
    </Section>
  );
}
