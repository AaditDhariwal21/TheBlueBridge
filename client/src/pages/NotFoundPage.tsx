import { Link } from 'react-router';

import { Container } from '../components/layout/Container';
import { Section } from '../components/layout/Section';
import { DeadEnd } from '../components/ui/DeadEnd';
import { buttonClasses } from '../components/ui/buttonClasses';
import { BLOGS_PATH } from '../features/blogs/lib/paths';

/** Any URL the route table doesn't know. The header and footer stay, so nobody is stranded. */
export function NotFoundPage() {
  return (
    <Section aria-labelledby="page-title" spacing="none" className="py-14 sm:py-20">
      <Container width="reading">
        <DeadEnd
          size="page"
          headingLevel="h1"
          eyebrow="Page not found"
          title="This bridge doesn’t lead anywhere"
          actions={
            <>
              <Link to="/" className={buttonClasses({ size: 'lg' })}>
                Back to home
              </Link>
              <Link to={BLOGS_PATH} className={buttonClasses({ variant: 'outline', size: 'lg' })}>
                Read the blogs
              </Link>
            </>
          }
        >
          <p>
            The page you were looking for isn’t here. It may have moved, or the link may be
            incomplete. Let’s get you back on solid ground.
          </p>
        </DeadEnd>
      </Container>
    </Section>
  );
}
