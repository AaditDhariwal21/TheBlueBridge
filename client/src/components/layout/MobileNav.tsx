import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';

import { NAV_LINKS } from '../../app/site';
import { Motto } from '../ui/Motto';
import { Wordmark } from '../ui/Wordmark';
import { Container } from './Container';
import { NavItem, AccountLink } from './NavItem';

/** Must match the `sm` breakpoint where the desktop nav takes over. */
const DESKTOP_QUERY = '(min-width: 40rem)';

/**
 * Full-screen mobile menu built on the native modal <dialog>:
 * - showModal() makes the rest of the page inert, so focus stays inside.
 * - Escape fires the dialog's native `cancel` → `close`.
 * - Focus returns to the menu button on close.
 * - Closes on navigation and when the viewport widens to desktop.
 */
export function MobileNav() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  const show = () => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    setOpen(true);
    closeButtonRef.current?.focus();
  };

  const hide = useCallback(() => {
    if (dialogRef.current?.open) dialogRef.current.close();
  }, []);

  const handleClose = () => {
    setOpen(false);
    openButtonRef.current?.focus();
  };

  useEffect(hide, [pathname, hide]);

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) hide();
    };
    mql.addEventListener('change', onChange);
    return () => {
      mql.removeEventListener('change', onChange);
    };
  }, [hide]);

  return (
    <>
      <button
        ref={openButtonRef}
        type="button"
        onClick={show}
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="mobile-nav"
        className="-mr-2 grid size-11 place-items-center text-text sm:hidden"
      >
        <MenuIcon />
      </button>

      <dialog
        ref={dialogRef}
        id="mobile-nav"
        aria-label="Menu"
        data-tone="inverse"
        onClose={handleClose}
        className="m-0 size-full max-h-none max-w-none bg-bg p-0 text-text backdrop:bg-transparent sm:hidden"
      >
        <div className="flex min-h-full animate-rise flex-col">
          <Container className="flex h-header shrink-0 items-center justify-between">
            <Wordmark onClick={hide} />
            <button
              ref={closeButtonRef}
              type="button"
              onClick={hide}
              aria-label="Close menu"
              className="-mr-2 grid size-11 place-items-center text-text"
            >
              <CloseIcon />
            </button>
          </Container>

          <Container as="nav" aria-label="Mobile" className="flex flex-1 flex-col pt-10 pb-12">
            <ul className="flex flex-col gap-2 font-display text-h2">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <NavItem {...link} onNavigate={hide} className="block py-2" />
                </li>
              ))}
              <li>
                <AccountLink className="block py-2" onNavigate={hide} />
              </li>
            </ul>
            <Motto className="mt-auto pt-12" />
          </Container>
        </div>
      </dialog>
    </>
  );
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none">
      <path d="M4 9h16M4 15h16" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
