import { useId, type ReactNode } from 'react';

import { Avatar } from '../../../components/ui/Avatar';
import { Dialog } from '../../../components/ui/Dialog';
import type { Role } from '../../auth/types';
import { initialsOf } from '../../blogs/lib/text';
import { RoleLabel } from './RoleLabel';

interface MemberPanelProps {
  /** Who to show; the panel is open while this is set. */
  person: { id: string; name: string; role: Role; avatarUrl: string | null } | null;
  /** The signed-in member themself: "(You)" beside the name. */
  isViewer?: boolean;
  /** The line under the name: an account status (admin panel) or the occupation. */
  subtitle: ReactNode;
  onClose: () => void;
  /** The panel's sections (use PanelSection). */
  children: ReactNode;
}

/**
 * A member's profile in a side panel (a bottom sheet on phones): photo, then role, name and
 * one line under it, then sections. The community directory and the admin panel's
 * Community Directory both open people in it.
 */
export function MemberPanel({
  person,
  isViewer = false,
  subtitle,
  onClose,
  children,
}: MemberPanelProps) {
  const headingId = useId();
  return (
    <Dialog open={person !== null} onClose={onClose} labelledBy={headingId} variant="drawer">
      {person && (
        <>
          <div className="flex shrink-0 justify-end px-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid size-11 place-items-center text-text-muted transition-colors hover:text-text"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-gutter pb-10 sm:px-6">
            <div className="flex items-center gap-4">
              <Avatar
                user={{ id: person.id, initials: initialsOf(person.name) }}
                src={person.avatarUrl}
                size="lg"
                className="size-16 text-lg"
              />
              <div className="min-w-0">
                <RoleLabel role={person.role} />
                <h2 id={headingId} className="mt-1 text-h3 wrap-break-word">
                  {person.name}
                  {isViewer && (
                    <span className="ml-2 font-sans text-sm text-text-muted">(You)</span>
                  )}
                </h2>
                <div className="mt-1">{subtitle}</div>
              </div>
            </div>
            {children}
          </div>
        </>
      )}
    </Dialog>
  );
}

/** One titled section of a MemberPanel. */
export function PanelSection({ title, children }: { title: ReactNode; children: ReactNode }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="mt-8 border-t border-border pt-6">
      <h3 id={titleId} className="mb-4 font-sans text-xs tracking-caps text-text-muted uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}
