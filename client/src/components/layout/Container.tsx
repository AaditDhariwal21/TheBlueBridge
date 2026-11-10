import type { ComponentPropsWithoutRef, ElementType } from 'react';

import { cn } from '../../lib/cn';

const WIDTHS = {
  page: 'max-w-page',
  reading: 'max-w-reading',
  narrow: 'max-w-narrow',
} as const;

type ContainerProps<T extends ElementType> = {
  as?: T;
  width?: keyof typeof WIDTHS;
} & Omit<ComponentPropsWithoutRef<T>, 'as'>;

/** Horizontally centred, gutter-padded content column. */
export function Container<T extends ElementType = 'div'>({
  as,
  width = 'page',
  className,
  ...props
}: ContainerProps<T>) {
  const Tag: ElementType = as ?? 'div';
  return <Tag className={cn('mx-auto w-full px-gutter', WIDTHS[width], className)} {...props} />;
}
