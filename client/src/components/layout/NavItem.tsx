import { NavLink } from 'react-router';

import { preloadRoute } from '../../app/routes';
import { PLACEHOLDER_HREF } from '../../app/site';
import { cn } from '../../lib/cn';

const BASE =
  'text-text-muted underline-offset-8 transition-colors hover:text-text ' +
  'aria-[current=page]:text-text aria-[current=page]:underline aria-[current=page]:decoration-accent-soft';

interface NavItemProps {
  to: string;
  label: string;
  className?: string;
  onNavigate?: () => void;
}

/** Internal nav link: marks the current page and warms its chunk on intent. */
export function NavItem({ to, label, className, onNavigate }: NavItemProps) {
  const warm = () => {
    preloadRoute(to);
  };
  return (
    <NavLink
      to={to}
      className={cn(BASE, className)}
      onMouseEnter={warm}
      onFocus={warm}
      onClick={onNavigate}
    >
      {label}
    </NavLink>
  );
}

/** Placeholder: sign-in is out of scope for this phase. */
export function SignInLink({ className }: { className?: string }) {
  return (
    <a href={PLACEHOLDER_HREF.signIn} className={cn(BASE, className)}>
      Sign in
    </a>
  );
}
