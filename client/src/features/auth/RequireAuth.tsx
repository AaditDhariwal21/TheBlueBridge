import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';

import { Container } from '../../components/layout/Container';
import { Section } from '../../components/layout/Section';
import { Button } from '../../components/ui/Button';
import { StateMessage } from '../../components/ui/StateMessage';
import { useAuth } from './authContext';
import { signInPathFor } from './paths';

/**
 * Protected-route helper: renders its children only for a signed-in user with a
 * profile. Signed-out visitors go to sign-in and come back here afterwards.
 * Role and status checks are the page's job (and always the API's).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { state, reload } = useAuth();
  const { pathname, search } = useLocation();

  if (state.status === 'signedIn') return children;
  if (state.status === 'signedOut')
    return <Navigate to={signInPathFor(pathname + search)} replace />;

  return (
    <Section aria-labelledby="page-title">
      <Container width="narrow">
        {state.status === 'loading' ? (
          <div aria-busy="true" className="flex min-h-64 items-center justify-center">
            <h1 id="page-title" className="text-sm text-text-muted motion-safe:animate-shimmer">
              Loading your account…
            </h1>
          </div>
        ) : (
          <StateMessage
            role="alert"
            headingLevel="h1"
            title="We couldn’t load your account"
            action={<Button onClick={reload}>Try again</Button>}
          >
            Check your connection, then try again.
          </StateMessage>
        )}
      </Container>
    </Section>
  );
}
