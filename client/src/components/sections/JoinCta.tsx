import { Link } from 'react-router';

import { AUTH_PATHS } from '../../features/auth/paths';
import { Container } from '../layout/Container';
import { Section } from '../layout/Section';
import { buttonClasses } from '../ui/buttonClasses';
import { Constellation } from '../ui/Constellation';
import { Reveal } from '../ui/Reveal';

/** Home's closing band: the motto, then one call to action, to create an account. */
export function JoinCta() {
  return (
    <Section tone="inverse" aria-labelledby="join-title" className="overflow-hidden">
      <Constellation />
      <Container className="text-center">
        <Reveal className="flex flex-col items-center">
          <h2 id="join-title" className="text-h2">
            Connection. Community. Confluence.
          </h2>
          <p className="mt-4 text-body-lg text-text-muted">Ready to join?</p>
          <Link to={AUTH_PATHS.signUp} className={buttonClasses({ size: 'lg', className: 'mt-8' })}>
            Create your account
          </Link>
        </Reveal>
      </Container>
    </Section>
  );
}
