import { useState, type ComponentPropsWithRef } from 'react';

import { Input } from '../../../components/ui/Input';

type PasswordInputProps = Omit<ComponentPropsWithRef<'input'>, 'type'>;

/** Password field with a Show/Hide toggle, so people can check what they typed. */
export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        autoCapitalize="none"
        spellCheck={false}
        className="pr-16"
      />
      <button
        type="button"
        onClick={() => {
          setVisible((v) => !v);
        }}
        aria-pressed={visible}
        aria-label="Show password"
        className="absolute inset-y-0 right-0 min-w-11 px-2 text-sm text-text-muted transition-colors hover:text-text"
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
