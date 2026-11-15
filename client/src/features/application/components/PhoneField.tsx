import { useId } from 'react';

import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { cn } from '../../../lib/cn';
import { callingCodeOf } from '../../../../../shared/phone';
import { COUNTRY_OPTIONS } from '../countries';

/** Countries the phone library can dial, by name, with their codes. */
const DIAL_OPTIONS = COUNTRY_OPTIONS.flatMap(({ code, name }) => {
  const dial = callingCodeOf(code);
  return dial ? [{ code, label: `${dial} ${name}` }] : [];
});

interface PhoneFieldProps {
  country: string;
  number: string;
  onCountryChange: (country: string) => void;
  onNumberChange: (number: string) => void;
  error?: string | undefined;
}

/**
 * Mobile number: a dialling-code picker and the number. Checked with libphonenumber-js
 * (here and on the server) and stored in E.164, e.g. +919876543210.
 */
export function PhoneField({
  country,
  number,
  onCountryChange,
  onNumberChange,
  error,
}: PhoneFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = cn(hintId, error && errorId);

  return (
    <fieldset aria-describedby={describedBy}>
      <legend className="text-sm text-text-muted">Mobile number</legend>
      <div className="mt-1.5 flex gap-3">
        <Select
          aria-label="Country code"
          className="w-32 shrink-0 sm:w-44"
          value={country}
          autoComplete="tel-country-code"
          onChange={(e) => {
            onCountryChange(e.target.value);
          }}
        >
          {DIAL_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </Select>
        <Input
          id={`${id}-number`}
          aria-label="Mobile number"
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          type="tel"
          name="phoneNational"
          inputMode="tel"
          autoComplete="tel-national"
          maxLength={20}
          value={number}
          onChange={(e) => {
            onNumberChange(e.target.value);
          }}
        />
      </div>
      <p id={hintId} className="mt-1.5 text-xs text-text-subtle">
        Choose your country code, then the number without it.
      </p>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
