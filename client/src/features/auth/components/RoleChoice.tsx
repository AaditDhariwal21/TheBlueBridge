import { useId } from 'react';

import { cn } from '../../../lib/cn';
import type { AppliedRole } from '../types';

const OPTIONS = [
  {
    value: 'member',
    label: 'Member',
    description: 'Write blogs, join discussions and ask the community questions.',
  },
  {
    value: 'ambassador',
    label: 'Ambassador',
    description:
      'Everything a member does, plus answering questions and keeping discussions healthy in one or two categories you know well.',
  },
] as const satisfies readonly { value: AppliedRole; label: string; description: string }[];

interface RoleChoiceProps {
  value: AppliedRole | '';
  onChange: (role: AppliedRole) => void;
  error?: string | undefined;
}

/** Two radio cards. Native radios, so arrow keys and screen readers work as expected. */
export function RoleChoice({ value, onChange, error }: RoleChoiceProps) {
  const errorId = useId();
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="text-sm text-text-muted">How would you like to join?</legend>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((option) => (
          <label key={option.value} className="relative flex">
            <input
              type="radio"
              name="appliedRole"
              value={option.value}
              checked={value === option.value}
              onChange={() => {
                onChange(option.value);
              }}
              data-invalid={error ? true : undefined}
              className="peer sr-only"
            />
            <span
              className={cn(
                'grid w-full cursor-pointer grid-cols-[auto_1fr] content-start items-center gap-x-2 gap-y-1 border p-4 font-medium transition-colors',
                'border-border bg-surface hover:border-border-strong',
                'peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary peer-checked:ring-inset',
                'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
                error && 'border-danger',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'size-3 rounded-full',
                  value === option.value
                    ? 'border-4 border-primary'
                    : 'border border-border-strong',
                )}
              />
              {option.label}
              <span className="col-span-2 text-sm font-normal text-text-muted">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </div>
      {value === 'ambassador' && (
        <p className="mt-2 text-xs text-text-muted">
          Ambassador powers start once an admin approves your application.
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
