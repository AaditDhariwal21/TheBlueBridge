import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { useAuth } from '../features/auth/authContext';
import { AuthShell } from '../features/auth/components/AuthShell';
import { SignInForm } from '../features/auth/components/SignInForm';
import { AUTH_PATHS, destinationAfterSignIn, safeNextPath } from '../features/auth/paths';
import { Button } from '../components/ui/Button';

export function SignInPage() {
  const { state, reload } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNextPath(params.get('next'));

  useEffect(() => {
    if (state.status === 'signedIn') {
      void navigate(destinationAfterSignIn(state.me, next), { replace: true });
    }
  }, [state, next, navigate]);

  return (
    <AuthShell
      eyebrow="Members"
      title="Sign in"
      intro={<p>Welcome back to The Blue Bridge.</p>}
      footer={
        <p>
          Have an invitation?{' '}
          <Link
            to={AUTH_PATHS.signUp}
            className="text-text underline decoration-accent-2-soft underline-offset-4 hover:decoration-text"
          >
            Create your account
          </Link>
        </p>
      }
    >
      {state.status === 'error' ? (
        <div role="alert" className="flex flex-col items-start gap-4">
          <p className="text-sm text-danger">
            You’re signed in, but we couldn’t load your account. Check your connection and try
            again.
          </p>
          <Button onClick={reload}>Try again</Button>
        </div>
      ) : (
        <SignInForm />
      )}
    </AuthShell>
  );
}
