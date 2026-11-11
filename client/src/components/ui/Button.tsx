import type { ComponentPropsWithoutRef } from 'react';

import { buttonClasses, type ButtonStyleProps } from './buttonClasses';

type ButtonProps = ComponentPropsWithoutRef<'button'> & ButtonStyleProps;

/** For links that look like buttons, put buttonClasses() on a router <Link>. */
export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}
