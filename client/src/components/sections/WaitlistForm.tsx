import { useEffect, useRef, useState, type SubmitEvent } from 'react';

import { submitWaitlist } from '../../lib/submitWaitlist';
import {
  EMAIL_MAX,
  NAME_MAX,
  validateWaitlist,
  type WaitlistErrors,
  type WaitlistInput,
} from '../../lib/waitlist';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Input } from '../ui/Input';

type Status = 'idle' | 'submitting' | 'success' | 'error';

/**
 * Waitlist sign-up. UI only: all submission goes through `submitWaitlist()`.
 * - Validates on submit, then live per-field once the user has tried once.
 * - Moves focus to the first invalid field; errors are linked via aria-describedby.
 * - Success replaces the form and receives focus, so it's announced.
 */
export function WaitlistForm() {
  const [values, setValues] = useState<WaitlistInput>({ name: '', email: '' });
  const [errors, setErrors] = useState<WaitlistErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [submittedName, setSubmittedName] = useState('');

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (status === 'success') successRef.current?.focus();
  }, [status]);

  const update = (field: keyof WaitlistInput, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    if (attempted) setErrors(validateWaitlist(next).errors);
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'submitting') return;

    setAttempted(true);
    const result = validateWaitlist(values);
    setErrors(result.errors);
    if (result.errors.name || result.errors.email) {
      (result.errors.name ? nameRef : emailRef).current?.focus();
      return;
    }

    setStatus('submitting');
    const response = await submitWaitlist(result.values);
    if (response.ok) {
      setSubmittedName(result.values.name.split(' ')[0] ?? '');
      setStatus('success');
    } else {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <p
        ref={successRef}
        role="status"
        tabIndex={-1}
        className="mx-auto max-w-narrow border border-border px-6 py-5 text-body-lg"
      >
        Thank you{submittedName && `, ${submittedName}`}. We’ll keep you posted.
      </p>
    );
  }

  const submitting = status === 'submitting';

  return (
    <form
      noValidate
      aria-label="Join the waitlist"
      onSubmit={(e) => void handleSubmit(e)}
      className="mx-auto flex max-w-reading flex-col gap-6 text-left sm:flex-row sm:flex-wrap sm:items-start sm:gap-4"
    >
      <Field label="Name" error={errors.name} className="sm:flex-1">
        {(control) => (
          <Input
            {...control}
            ref={nameRef}
            name="name"
            autoComplete="name"
            maxLength={NAME_MAX}
            value={values.name}
            onChange={(e) => {
              update('name', e.target.value);
            }}
          />
        )}
      </Field>

      <Field label="Email address" error={errors.email} className="sm:flex-1">
        {(control) => (
          <Input
            {...control}
            ref={emailRef}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={EMAIL_MAX}
            value={values.email}
            onChange={(e) => {
              update('email', e.target.value);
            }}
          />
        )}
      </Field>

      {/* Aligns the button with the inputs, below their labels, on wide screens. */}
      <div className="sm:pt-6.5">
        <Button type="submit" aria-disabled={submitting || undefined} className="w-full sm:w-auto">
          {submitting ? 'Sending…' : 'Notify me'}
        </Button>
      </div>

      {status === 'error' && (
        <p role="alert" className="text-sm text-danger sm:basis-full">
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}
