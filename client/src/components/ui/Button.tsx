import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../../lib/cn';
import { buttonClasses, type ButtonStyleProps } from './buttonClasses';

type ButtonProps = ComponentPropsWithoutRef<'button'> & ButtonStyleProps;

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}

type ButtonLinkProps = ComponentPropsWithoutRef<'a'> & ButtonStyleProps & { href: string };

/** An anchor styled as a button. External URLs get safe `rel` automatically. */
export function ButtonLink({ variant, size, className, rel, children, ...props }: ButtonLinkProps) {
  const isExternal = /^https?:\/\//.test(props.href);
  return (
    <a
      className={buttonClasses({ variant, size, className })}
      rel={isExternal ? cn('noopener noreferrer', rel) : rel}
      {...props}
    >
      {children}
    </a>
  );
}
