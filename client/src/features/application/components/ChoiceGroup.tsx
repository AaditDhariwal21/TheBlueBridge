import { useId, type ReactNode } from 'react';

import { cn } from '../../../lib/cn';
import type { ProfileOption } from '../types';

type ChoiceGroupProps = {
  legend: string;
  hint?: string;
  name: string;
  options: readonly ProfileOption[];
  error?: string | undefined;
  /** Shown under the options, e.g. the "Other" text field. */
  children?: ReactNode;
} & (
  | { multiple: true; value: readonly string[]; onChange: (codes: string[]) => void }
  | { multiple?: false; value: string; onChange: (code: string) => void }
);

/**
 * One question with fixed answers: checkboxes ("choose all that apply") or radios, as
 * full-width rows that are easy to tap. Native inputs, so keyboards and screen readers
 * work as usual; the fieldset's legend is the question.
 */
export function ChoiceGroup(props: ChoiceGroupProps) {
  const { legend, hint, name, options, error, children } = props;
  const hintId = useId();
  const errorId = useId();
  const describedBy = cn(hint && hintId, error && errorId) || undefined;

  const isChecked = (code: string) =>
    props.multiple ? props.value.includes(code) : props.value === code;
  const toggle = (code: string) => {
    if (props.multiple) {
      props.onChange(
        props.value.includes(code)
          ? props.value.filter((c) => c !== code)
          : // Keep the options' order, whatever order they were ticked in.
            options.map((o) => o.code).filter((c) => c === code || props.value.includes(c)),
      );
    } else {
      props.onChange(code);
    }
  };

  return (
    <fieldset aria-describedby={describedBy}>
      <legend className="text-sm text-text">{legend}</legend>
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-text-subtle">
          {hint}
        </p>
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const checked = isChecked(option.code);
          return (
            <label key={option.code} className="relative flex">
              <input
                type={props.multiple ? 'checkbox' : 'radio'}
                name={name}
                value={option.code}
                checked={checked}
                onChange={() => {
                  toggle(option.code);
                }}
                {...(props.multiple
                  ? { 'aria-invalid': error ? true : undefined }
                  : { 'data-invalid': error ? true : undefined })}
                className="peer sr-only"
              />
              <span
                className={cn(
                  'flex min-h-11 w-full cursor-pointer items-center gap-3 border px-3 py-2.5 text-sm transition-colors',
                  'border-border bg-surface hover:border-border-strong',
                  'peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary peer-checked:ring-inset',
                  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
                  error && 'border-danger',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-4 shrink-0 place-items-center border',
                    props.multiple ? '' : 'rounded-full',
                    checked ? 'border-primary bg-primary text-on-primary' : 'border-border-strong',
                  )}
                >
                  {checked &&
                    (props.multiple ? (
                      <svg viewBox="0 0 16 16" className="size-3" fill="none">
                        <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    ) : (
                      <span className="size-1.5 rounded-full bg-on-primary" />
                    ))}
                </span>
                <span className="text-text">{option.label}</span>
              </span>
            </label>
          );
        })}
      </div>
      {children}
      {error && (
        <p id={errorId} className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
