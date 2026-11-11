import { NavLink } from 'react-router';

import { preloadRoute } from '../../app/routes';
import { useAuth } from '../../features/auth/authContext';
import { AUTH_PATHS } from '../../features/auth/paths';
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

/** "Sign in" for visitors, "Account" once signed in. */
export function AccountLink({ className, onNavigate }: Omit<NavItemProps, 'to' | 'label'>) {
  const { state } = useAuth();
  const signedIn = state.status === 'signedIn';
  return (
    <NavItem
      to={signedIn ? AUTH_PATHS.account : AUTH_PATHS.signIn}
      label={signedIn ? 'Account' : 'Sign in'}
      {...(className !== undefined && { className })}
      {...(onNavigate !== undefined && { onNavigate })}
    />
  );
}
