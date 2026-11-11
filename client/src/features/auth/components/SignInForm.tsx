import { useState, type SubmitEvent } from 'react';

import { Button } from '../../../components/ui/Button';
import { Field } from '../../../components/ui/Field';
import { Input } from '../../../components/ui/Input';
import { useAuth } from '../authContext';
import { useFocusFirstInvalid } from '../useFocusFirstInvalid';
import { EMAIL_MAX } from '../validation';
import { PasswordInput } from './PasswordInput';

type Failure = 'invalid' | 'unavailable' | null;

const FAILURE_MESSAGES = {
  invalid: 'That email and password don’t match an account. Check them and try again.',
  unavailable: 'Sign-in isn’t available right now. Please try again in a moment.',
} as const;

const NOTICE_MESSAGES = {
  noAccount:
    'This sign-in isn’t linked to a Blue Bridge membership. If you applied recently, please contact the member who invited you.',
  notConfigured: 'Sign-in isn’t set up on this site yet.',
} as const;

/** Email + password through Supabase. The page redirects once the profile has loaded. */
export function SignInForm() {
  const { state, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<Failure>(null);
  const [formRef, focusFirstInvalid] = useFocusFirstInvalid<HTMLFormElement>();

  // Signing in is followed by loading the profile; stay busy through both.
  const busy = submitting || state.status === 'loading';
  const notice = state.status === 'signedOut' ? state.notice : undefined;

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;

    const nextErrors: typeof errors = {};
    if (!email.trim()) nextErrors.email = 'Enter your email address.';
    if (!password) nextErrors.password = 'Enter your password.';
    setErrors(nextErrors);
    setFailure(null);
    if (nextErrors.email || nextErrors.password) {
      focusFirstInvalid();
      return;
    }

    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);
    if (!result.ok) setFailure(result.reason);
  };

  return (
    <form
      ref={formRef}
      noValidate
      aria-labelledby="page-title"
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-6"
    >
      {(failure ?? notice) && (
        <p role="alert" className="border-l-2 border-danger pl-3 text-sm text-danger">
          {failure ? FAILURE_MESSAGES[failure] : notice && NOTICE_MESSAGES[notice]}
        </p>
      )}

      <Field label="Email address" error={errors.email}>
        {(control) => (
          <Input
            {...control}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={EMAIL_MAX}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
          />
        )}
      </Field>

      <Field label="Password" error={errors.password}>
        {(control) => (
          <PasswordInput
            {...control}
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
        )}
      </Field>

      <Button type="submit" size="lg" aria-disabled={busy || undefined} className="w-full">
        {busy ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
