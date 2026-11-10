import { Link } from 'react-router';

import { Container } from '../components/layout/Container';
import { Section } from '../components/layout/Section';
import { buttonClasses } from '../components/ui/buttonClasses';

export function NotFoundPage() {
  return (
    <Section aria-labelledby="page-title">
      <Container width="reading">
        <h1 id="page-title" className="text-h1">
          Page not found
        </h1>
        <p className="mt-4 text-lg text-text-muted">
          The page you’re looking for doesn’t exist or may have moved.
        </p>
        <Link to="/" className={buttonClasses({ className: 'mt-8' })}>
          Back to home
        </Link>
      </Container>
    </Section>
  );
}
