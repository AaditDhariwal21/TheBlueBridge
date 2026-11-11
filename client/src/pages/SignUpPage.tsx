import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { buttonClasses } from '../components/ui/buttonClasses';
import { useAuth } from '../features/auth/authContext';
import { AuthShell } from '../features/auth/components/AuthShell';
import { DetailsStep } from '../features/auth/components/DetailsStep';
import { ReferralCodeStep } from '../features/auth/components/ReferralCodeStep';
import { AUTH_PATHS } from '../features/auth/paths';
import { INVALID_CODE_MESSAGE } from '../features/auth/validation';

type Step =
  | { name: 'code'; error?: string }
  | { name: 'details' }
  /** Accepted, but signing in automatically didn't work (e.g. the email already had an account). */
  | { name: 'received' };

const STEP_TITLES = {
  code: 'Step 1 of 2: Your invitation',
  details: 'Step 2 of 2: About you',
  received: 'Application received',
} as const;

/**
 * Sign-up: referral code first (checked with the API), then details. On
 * success the user is signed in and lands on /account, which shows the
 * "waiting for approval" state.
 */
export function SignUpPage() {
  const { state, signIn } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>({ name: 'code' });
  const [code, setCode] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step.name);

  useEffect(() => {
    if (state.status === 'signedIn') void navigate(AUTH_PATHS.account, { replace: true });
  }, [state, navigate]);

  // Each new step is announced by moving focus to its heading (not on first load).
  useEffect(() => {
    if (previousStep.current === step.name) return;
    previousStep.current = step.name;
    headingRef.current?.focus();
  }, [step.name]);

  const handleSubmitted = async (email: string, password: string) => {
    const result = await signIn(email, password);
    if (!result.ok) setStep({ name: 'received' });
    // On success the auth state changes and the effect above navigates.
  };

  return (
    <AuthShell
      eyebrow="Join"
      title="Create your account"
      intro={<p>A community of professional women from Jodhpur, by invitation.</p>}
      footer={
        step.name !== 'received' && (
          <p>
            Already a member?{' '}
            <Link
              to={AUTH_PATHS.signIn}
              className="text-text underline decoration-accent-2-soft underline-offset-4 hover:decoration-text"
            >
              Sign in
            </Link>
          </p>
        )
      }
    >
      <h2
        id="signup-step-title"
        ref={headingRef}
        tabIndex={-1}
        className="mb-6 font-sans text-xs tracking-caps text-text-muted uppercase"
      >
        {STEP_TITLES[step.name]}
      </h2>

      {step.name === 'code' && (
        <ReferralCodeStep
          initialCode={code}
          initialError={step.error}
          onValid={(valid) => {
            setCode(valid);
            setStep({ name: 'details' });
          }}
        />
      )}

      {step.name === 'details' && (
        <DetailsStep
          referralCode={code}
          onChangeCode={() => {
            setStep({ name: 'code' });
          }}
          onCodeRejected={() => {
            setStep({ name: 'code', error: INVALID_CODE_MESSAGE });
          }}
          onSubmitted={handleSubmitted}
        />
      )}

      {step.name === 'received' && (
        <div role="status" className="flex flex-col items-start gap-4">
          <p className="text-text-muted">
            Thank you. Sign in to see the status of your application.
          </p>
          <Link to={AUTH_PATHS.signIn} className={buttonClasses()}>
            Sign in
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
