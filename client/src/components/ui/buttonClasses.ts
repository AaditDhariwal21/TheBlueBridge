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
    'border-danger bg-danger text-on-primary hover:bg-transparent hover:text-danger ' +
    'aria-disabled:hover:bg-danger aria-disabled:hover:text-on-primary',
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
    'aria-disabled:cursor-not-allowed aria-disabled:opacity-70',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}
