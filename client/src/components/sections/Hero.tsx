import { Link } from 'react-router';

import { HERO_BRIDGE } from '../../assets/images';
import { AUTH_PATHS } from '../../features/auth/paths';
import { Container } from '../layout/Container';
import { Section } from '../layout/Section';
import { buttonClasses } from '../ui/buttonClasses';
import { Picture } from '../ui/Picture';

const TAGLINE = 'A global community of professional women from Jodhpur.';

/** The image carries the brand lockup, so its alt text includes those words. */
const HERO_ALT =
  'Two women meeting at the centre of a glowing bridge beneath a constellation, above the words The Blue Bridge: Connection, Community, Confluence.';

export function Hero() {
  return (
    <Section tone="inverse" spacing="none" aria-labelledby="hero-title" className="pb-section">
      <div className="mx-auto max-w-hero overflow-hidden">
        <Picture
          image={HERO_BRIDGE}
          alt={HERO_ALT}
          sizes="(min-width: 110rem) 110rem, 100vw"
          priority
          className="motion-safe:animate-fade"
          // Mobile crops ~10% from each side (navy margin) so the lockup reads larger.
          imgClassName="aspect-hero-crop object-cover sm:aspect-hero"
        />
      </div>

      <Container className="text-center">
        <h1
          id="hero-title"
          className="mx-auto mt-6 max-w-reading text-tagline italic motion-safe:animate-rise sm:mt-2"
          style={{ animationDelay: '200ms' }}
        >
          {TAGLINE}
        </h1>
        <div className="mt-8 motion-safe:animate-rise" style={{ animationDelay: '350ms' }}>
          <Link to={AUTH_PATHS.signUp} className={buttonClasses({ size: 'lg' })}>
            Create your account
          </Link>
        </div>
      </Container>
    </Section>
  );
}
