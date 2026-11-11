import { NAV_LINKS } from '../../app/site';
import { cn } from '../../lib/cn';
import { useScrolled } from '../../lib/useScrolled';
import { Wordmark } from '../ui/Wordmark';
import { Container } from './Container';
import { MobileNav } from './MobileNav';
import { NavItem, AccountLink } from './NavItem';

export function Header() {
  const scrolled = useScrolled();

  return (
    <header
      data-tone="inverse"
      className={cn(
        'sticky top-0 z-40 border-b bg-bg transition-colors',
        scrolled ? 'border-border' : 'border-transparent',
      )}
    >
      <Container className="flex h-header items-center justify-between">
        <Wordmark />

        <nav aria-label="Main" className="hidden sm:block">
          <ul className="flex items-center gap-6 text-sm md:gap-8">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavItem {...link} />
              </li>
            ))}
            <li>
              <AccountLink />
            </li>
          </ul>
        </nav>

        <MobileNav />
      </Container>
    </header>
  );
}
