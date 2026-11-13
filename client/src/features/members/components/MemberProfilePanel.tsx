import { useCallback } from 'react';

import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useAsync } from '../../../lib/useAsync';
import { AuthorActivity } from '../../blogs/components/mine/MyActivity';
import { fetchProfile } from '../api';
import type { MemberSummary } from '../types';
import { MemberPanel, PanelSection } from './MemberPanel';
import { ProfileDetails } from './ProfileDetails';

interface MemberProfilePanelProps {
  viewerId: string;
  /** The row that was opened: shown at once while the rest of the profile loads. */
  member: MemberSummary | null;
  onClose: () => void;
}

/** A member's profile from the community directory: contact details, blogs and comments. */
export function MemberProfilePanel({ viewerId, member, onClose }: MemberProfilePanelProps) {
  return (
    <MemberPanel
      person={member}
      isViewer={member?.id === viewerId}
      subtitle={<p className="text-sm wrap-break-word text-text-muted">{member?.occupation}</p>}
      onClose={onClose}
    >
      {member && <ProfileSections key={member.id} viewerId={viewerId} memberId={member.id} />}
    </MemberPanel>
  );
}

const SKELETON_WIDTHS = ['w-2/3', 'w-3/4', 'w-1/2'] as const;

function ProfileSections({ viewerId, memberId }: { viewerId: string; memberId: string }) {
  const load = useCallback(
    (signal: AbortSignal) => fetchProfile(viewerId, memberId, signal),
    [viewerId, memberId],
  );
  const profile = useAsync(load);

  return (
    <>
      <PanelSection title="Profile">
        <div aria-busy={profile.status === 'loading' || undefined}>
          {profile.data ? (
            <ProfileDetails profile={profile.data} omitOccupation />
          ) : profile.status === 'error' ? (
            <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-danger">This profile couldn’t be loaded.</span>
              <Button variant="outline" onClick={profile.retry}>
                Try again
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <span className="sr-only">Loading profile…</span>
              {SKELETON_WIDTHS.map((width) => (
                <Skeleton key={width} className={`h-4 ${width}`} />
              ))}
            </div>
          )}
        </div>
      </PanelSection>
      <PanelSection title="Blogs and comments">
        <AuthorActivity authorId={memberId} />
      </PanelSection>
    </>
  );
}
