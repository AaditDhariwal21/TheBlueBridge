import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { buttonClasses } from '../components/ui/buttonClasses';
import { signup } from '../features/auth/api';
import { useAuth } from '../features/auth/authContext';
import { AuthShell } from '../features/auth/components/AuthShell';
import { ReferralCodeStep } from '../features/auth/components/ReferralCodeStep';
import { AUTH_PATHS } from '../features/auth/paths';
import { INVALID_CODE_MESSAGE } from '../features/auth/validation';
import { ApplicationForm } from '../features/application/components/ApplicationForm';
import { EMPTY_DRAFT, type ApplicationDraft } from '../features/application/model';
import { ApiError } from '../lib/api';

type Step =
  | { name: 'code'; error?: string }
  | { name: 'application' }
  /** Accepted, but signing in automatically didn't work (e.g. the email already had an account). */
  | { name: 'received' };

/**
 * Sign-up: the invitation code first (checked with the API), then the application in short
 * steps (Back from the first one returns to the code). On success the user is signed in and
 * lands on /account, which shows the "waiting for approval" state. Answers survive going back
 * to change the code.
 */
export function SignUpPage() {
  const { state, signIn } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>({ name: 'code' });
  const [code, setCode] = useState('');
  // Kept here so the answers survive going back to change the code.
  const [draft, setDraft] = useState<ApplicationDraft>(EMPTY_DRAFT);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step.name);

  useEffect(() => {
    if (state.status === 'signedIn') void navigate(AUTH_PATHS.account, { replace: true });
  }, [state, navigate]);

  // The code step and the confirmation are announced by focusing their heading (the
  // application form does the same for its own steps).
  useEffect(() => {
    if (previousStep.current === step.name) return;
    previousStep.current = step.name;
    headingRef.current?.focus();
  }, [step.name]);

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
      {step.name === 'code' && (
        <>
          <h2
            id="signup-step-title"
            ref={headingRef}
            tabIndex={-1}
            className="mb-6 font-sans text-xs tracking-caps text-text-muted uppercase"
          >
            Step 1 of 7: Your invitation
          </h2>
          <ReferralCodeStep
            initialCode={code}
            initialError={step.error}
            onValid={(valid) => {
              setCode(valid);
              setStep({ name: 'application' });
            }}
          />
        </>
      )}

      {step.name === 'application' && (
        <ApplicationForm
          mode="signup"
          stepsBefore={1}
          initialDraft={draft}
          onDraftChange={setDraft}
          // Back from the first step returns to the code; the answers stay.
          onBackFromStart={() => {
            setStep({ name: 'code' });
          }}
          submitLabel="Send application"
          busyLabel="Sending…"
          footnote={
            <p className="text-center text-xs text-text-subtle">
              An admin reviews every application. You can sign in while you wait.
            </p>
          }
          onSubmit={async (application, answers) => {
            try {
              await signup({
                ...application,
                referralCode: code,
                email: answers.email.trim().toLowerCase(),
                password: answers.password,
              });
            } catch (error) {
              // The code stopped being valid since step 1: ask for it again.
              if (error instanceof ApiError && error.code === 'INVALID_REFERRAL_CODE') {
                setStep({ name: 'code', error: INVALID_CODE_MESSAGE });
                return;
              }
              throw error;
            }
            const result = await signIn(answers.email.trim().toLowerCase(), answers.password);
            // On success the auth state changes and the effect above navigates.
            if (!result.ok) setStep({ name: 'received' });
          }}
        />
      )}

      {step.name === 'received' && (
        <div role="status" className="flex flex-col items-start gap-4">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-sans text-xs tracking-caps text-text-muted uppercase"
          >
            Application received
          </h2>
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
