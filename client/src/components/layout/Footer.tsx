import { COPYRIGHT, NAV_LINKS } from '../../app/site';
import { Motto } from '../ui/Motto';
import { Wordmark } from '../ui/Wordmark';
import { Container } from './Container';
import { NavItem, AccountLink } from './NavItem';

export function Footer() {
  return (
    <footer data-tone="inverse" className="bg-bg">
      <Container className="py-12 sm:py-14">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-3">
            <Wordmark />
            <Motto />
          </div>

          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
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
        </div>

        <p className="mt-10 border-t border-border pt-6 text-xs text-text-subtle">{COPYRIGHT}</p>
      </Container>
    </footer>
  );
}
