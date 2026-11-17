import { cn } from '../../lib/cn';

const VARIANTS = {
  /** Filled. The strongest call to action in a section. */
  solid:
    'border-primary bg-primary text-on-primary hover:bg-transparent hover:text-primary ' +
    'aria-disabled:hover:bg-primary aria-disabled:hover:text-on-primary',
  /** The reference's outline button: inverts on hover. */
  outline:
    'border-primary text-primary hover:bg-primary hover:text-on-primary ' +
    'aria-disabled:hover:bg-transparent aria-disabled:hover:text-primary',
  /** Confirms something destructive (removing content). */
  danger:
    'border-danger bg-danger text-on-primary hover:border-danger-strong hover:bg-danger-strong ' +
    'focus-visible:outline-danger aria-disabled:hover:border-danger aria-disabled:hover:bg-danger',
  /** Starts something destructive or negative (opens its confirmation): red, but quieter. */
  'danger-outline':
    'border-danger text-danger hover:bg-danger hover:text-on-primary focus-visible:outline-danger ' +
    'aria-disabled:hover:bg-transparent aria-disabled:hover:text-danger',
} as const;

const SIZES = {
  md: 'min-h-11 px-6 py-2.5',
  lg: 'min-h-12 px-8 py-3',
} as const;

export interface ButtonStyleProps {
  variant?: keyof typeof VARIANTS | undefined;
  size?: keyof typeof SIZES | undefined;
}

/** Button styling, shared by <Button> and router <Link>s. */
export function buttonClasses({
  variant = 'solid',
  size = 'md',
  className,
}: ButtonStyleProps & { className?: string | undefined } = {}): string {
  return cn(
    'inline-flex items-center justify-center gap-2 border text-sm font-medium transition-colors',
    'active:translate-y-px aria-disabled:cursor-not-allowed aria-disabled:opacity-70 aria-disabled:active:translate-y-0',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

/**
 * A destructive action written as text ("Remove blog", "Remove"): red at rest, a darker red
 * and an underline on hover or keyboard focus, a red focus ring. Always opens a confirmation.
 */
export function dangerTextClasses(className?: string): string {
  return cn(
    'inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-medium text-danger',
    'decoration-1 underline-offset-4 transition-colors',
    'hover:text-danger-strong hover:underline active:text-danger-strong',
    'focus-visible:underline focus-visible:outline-danger',
    'aria-disabled:cursor-not-allowed aria-disabled:no-underline aria-disabled:opacity-70',
    className,
  );
}
