import { useState, type SubmitEvent } from 'react';

import { Button } from '../../../components/ui/Button';
import { Field } from '../../../components/ui/Field';
import { Input } from '../../../components/ui/Input';
import { ApiError } from '../../../lib/api';
import { signup } from '../api';
import { useFocusFirstInvalid } from '../useFocusFirstInvalid';
import {
  EMAIL_MAX,
  formatReferralCode,
  NAME_MAX,
  OCCUPATION_MAX,
  PASSWORD_MIN,
  validateDetails,
  type DetailsErrors,
  type SignupDetails,
} from '../validation';
import { CategoryPicker } from './CategoryPicker';
import { PasswordInput } from './PasswordInput';
import { RoleChoice } from './RoleChoice';

const EMPTY: SignupDetails = {
  name: '',
  email: '',
  password: '',
  phoneNumber: '',
  occupation: '',
  appliedRole: '',
  categoryIds: [],
};

const FIELD_KEYS = new Set<string>(Object.keys(EMPTY));

interface DetailsStepProps {
  referralCode: string;
  onChangeCode: () => void;
  /** The code stopped being valid between steps. */
  onCodeRejected: () => void;
  /** The application was accepted. Resolves once the follow-up (signing in) is done. */
  onSubmitted: (email: string, password: string) => Promise<void>;
}

/** Step 2: who you are and how you'd like to join. */
export function DetailsStep({
  referralCode,
  onChangeCode,
  onCodeRejected,
  onSubmitted,
}: DetailsStepProps) {
  const [details, setDetails] = useState<SignupDetails>(EMPTY);
  const [errors, setErrors] = useState<DetailsErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formRef, focusFirstInvalid] = useFocusFirstInvalid<HTMLFormElement>();

  const update = <K extends keyof SignupDetails>(key: K, value: SignupDetails[K]) => {
    const next = { ...details, [key]: value };
    setDetails(next);
    if (attempted) setErrors(validateDetails(next).errors);
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setAttempted(true);
    setFormError(null);
    const { values, errors: found } = validateDetails(details);
    const { appliedRole } = values;
    setErrors(found);
    if (Object.keys(found).length > 0 || appliedRole === '') {
      focusFirstInvalid();
      return;
    }

    setSubmitting(true);
    try {
      await signup({ ...values, appliedRole, referralCode });
      await onSubmitted(values.email, values.password);
    } catch (error) {
      handleApiError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApiError = (error: unknown) => {
    if (!(error instanceof ApiError)) {
      setFormError('Your application couldn’t be sent. Please try again.');
      return;
    }
    if (error.code === 'INVALID_REFERRAL_CODE') {
      onCodeRejected();
      return;
    }
    const fieldErrors = Object.fromEntries(
      Object.entries(error.fields).filter(([key]) => FIELD_KEYS.has(key)),
    ) as DetailsErrors;
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      focusFirstInvalid();
      return;
    }
    setFormError(
      error.code === 'RATE_LIMITED'
        ? 'Too many attempts. Please wait 15 minutes and try again.'
        : 'Your application couldn’t be sent. Please try again.',
    );
  };

  return (
    <form
      ref={formRef}
      noValidate
      aria-labelledby="signup-step-title"
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-7"
    >
      <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-4 text-sm text-text-muted">
        <span>
          Invited with code{' '}
          <span className="tracking-wide font-medium text-text">
            {formatReferralCode(referralCode)}
          </span>
        </span>
        <button
          type="button"
          onClick={onChangeCode}
          className="min-h-11 text-accent underline underline-offset-4 hover:text-text"
        >
          Change code
        </button>
      </p>

      <Field label="Full name" error={errors.name}>
        {(control) => (
          <Input
            {...control}
            name="name"
            autoComplete="name"
            maxLength={NAME_MAX + 20}
            value={details.name}
            onChange={(e) => {
              update('name', e.target.value);
            }}
          />
        )}
      </Field>

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
            value={details.email}
            onChange={(e) => {
              update('email', e.target.value);
            }}
          />
        )}
      </Field>

      <Field
        label="Password"
        error={errors.password}
        hint={`At least ${PASSWORD_MIN} characters. A short phrase is easy to remember.`}
      >
        {(control) => (
          <PasswordInput
            {...control}
            name="password"
            autoComplete="new-password"
            value={details.password}
            onChange={(e) => {
              update('password', e.target.value);
            }}
          />
        )}
      </Field>

      <Field
        label="Phone number"
        error={errors.phoneNumber}
        hint="With your country code, like +91 98765 43210. It isn’t shown on your public profile."
      >
        {(control) => (
          <Input
            {...control}
            type="tel"
            name="phoneNumber"
            autoComplete="tel"
            inputMode="tel"
            maxLength={24}
            value={details.phoneNumber}
            onChange={(e) => {
              update('phoneNumber', e.target.value);
            }}
          />
        )}
      </Field>

      <Field label="Occupation" error={errors.occupation} hint="For example, Chartered Accountant.">
        {(control) => (
          <Input
            {...control}
            name="occupation"
            autoComplete="organization-title"
            maxLength={OCCUPATION_MAX + 20}
            value={details.occupation}
            onChange={(e) => {
              update('occupation', e.target.value);
            }}
          />
        )}
      </Field>

      <RoleChoice
        value={details.appliedRole}
        error={errors.appliedRole}
        onChange={(role) => {
          update('appliedRole', role);
        }}
      />

      {details.appliedRole === 'ambassador' && (
        <CategoryPicker
          value={details.categoryIds}
          error={errors.categoryIds}
          onChange={(ids) => {
            update('categoryIds', ids);
          }}
        />
      )}

      {formError && (
        <p role="alert" className="border-l-2 border-danger pl-3 text-sm text-danger">
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <Button type="submit" size="lg" aria-disabled={submitting || undefined} className="w-full">
          {submitting ? 'Sending…' : 'Send application'}
        </Button>
        <p className="text-center text-xs text-text-subtle">
          An admin reviews every application. You can sign in while you wait.
        </p>
      </div>
    </form>
  );
}
