import { useState, type SubmitEvent } from 'react';

import { Button } from '../../../components/ui/Button';
import { Field } from '../../../components/ui/Field';
import { Input } from '../../../components/ui/Input';
import { ApiError } from '../../../lib/api';
import { validateReferralCode } from '../api';
import { useFocusFirstInvalid } from '../useFocusFirstInvalid';
import {
  INVALID_CODE_MESSAGE,
  isWellFormedReferralCode,
  normalizeReferralCode,
} from '../validation';

interface ReferralCodeStepProps {
  initialCode: string;
  initialError?: string | undefined;
  onValid: (code: string) => void;
}

/** Step 1: the invitation. Checked with the API before any details are asked for. */
export function ReferralCodeStep({ initialCode, initialError, onValid }: ReferralCodeStepProps) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState(initialError);
  const [checking, setChecking] = useState(false);
  const [formRef, focusFirstInvalid] = useFocusFirstInvalid<HTMLFormElement>();

  const fail = (message: string) => {
    setError(message);
    focusFirstInvalid();
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (checking) return;

    const normalized = normalizeReferralCode(code);
    if (!normalized) {
      fail('Enter the referral code from your invitation.');
      return;
    }
    if (!isWellFormedReferralCode(normalized)) {
      fail('Referral codes have 10 letters and numbers, like ABCDE-23456.');
      return;
    }

    setChecking(true);
    try {
      if (await validateReferralCode(normalized)) onValid(normalized);
      else fail(INVALID_CODE_MESSAGE);
    } catch (err) {
      fail(
        err instanceof ApiError && err.code === 'RATE_LIMITED'
          ? 'Too many attempts. Please wait 15 minutes and try again.'
          : 'We couldn’t check the code. Check your connection and try again.',
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <form
      ref={formRef}
      noValidate
      aria-labelledby="signup-step-title"
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-6"
    >
      <p className="text-sm text-text-muted">
        The Blue Bridge is invitation-only. Enter the code from the member who invited you.
      </p>

      <Field
        label="Referral code"
        error={error}
        hint="10 letters and numbers. Capitals and dashes don’t matter."
      >
        {(control) => (
          <Input
            {...control}
            name="referralCode"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={20}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (error) setError(undefined);
            }}
            className="tracking-caps uppercase"
          />
        )}
      </Field>

      <Button type="submit" size="lg" aria-disabled={checking || undefined} className="w-full">
        {checking ? 'Checking…' : 'Continue'}
      </Button>
    </form>
  );
}
