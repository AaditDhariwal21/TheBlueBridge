import { useCallback, useState } from 'react';

import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { LoadMoreButton } from '../../../components/ui/LoadMoreButton';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../components/ui/toast';
import { useAsync } from '../../../lib/useAsync';
import { usePagedList } from '../../../lib/usePagedList';
import { ROLE_LABELS } from '../../auth/labels';
import { canApproveMember } from '../../auth/permissions';
import { AuthorActivity } from '../../blogs/components/mine/MyActivity';
import { RelativeTime } from '../../blogs/components/shared/RelativeTime';
import { plural } from '../../blogs/lib/text';
import { useBlogActor } from '../../blogs/state/viewer';
import { MemberPanel, PanelSection } from '../../members/components/MemberPanel';
import { ProfileDetails } from '../../members/components/ProfileDetails';
import { RoleLabel } from '../../members/components/RoleLabel';
import { StatusLabel } from '../../members/components/StatusLabel';
import { toReferralsPage } from '../../referrals/api';
import { ReferralRow } from '../../referrals/components/ReferralRow';
import type { ReferralsDto } from '../../referrals/types';
import { approveMember, fetchMember, fetchMemberReferrals } from '../api';
import { ADMIN_REASON_MAX } from '../rules';
import type { AdminMember, AdminMemberSummary } from '../types';

const DATE = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' });
const SKELETON_WIDTHS = ['w-2/3', 'w-1/2', 'w-3/4'] as const;

interface AdminMemberDrawerProps {
  /** The row that was opened: shown at once while the full record loads. */
  member: AdminMemberSummary | null;
  onClose: () => void;
  onApproved: (member: AdminMember) => void;
}

/**
 * One member, for admins, in the same side panel the community directory uses: profile,
 * blogs and comments, who invited them, who used their code, and Approve when pending.
 */
export function AdminMemberDrawer({ member, onClose, onApproved }: AdminMemberDrawerProps) {
  const [approved, setApproved] = useState<string | null>(null);
  const status = approved !== null && approved === member?.id ? 'approved' : member?.status;
  return (
    <MemberPanel
      person={member}
      subtitle={status && <StatusLabel status={status} />}
      onClose={onClose}
    >
      {member && (
        <MemberRecord
          key={member.id}
          id={member.id}
          onApproved={(updated) => {
            setApproved(updated.member.id);
            onApproved(updated);
          }}
        />
      )}
    </MemberPanel>
  );
}

function MemberRecord({
  id,
  onApproved,
}: {
  id: string;
  onApproved: (member: AdminMember) => void;
}) {
  const load = useCallback((signal: AbortSignal) => fetchMember(id, signal), [id]);
  const record = useAsync(load);
  const actor = useBlogActor();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const data = record.data;

  if (!data) {
    return record.status === 'error' ? (
      <div role="alert" className="mt-8 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-danger">This member couldn’t be loaded.</span>
        <Button variant="outline" onClick={record.retry}>
          Try again
        </Button>
      </div>
    ) : (
      <div aria-busy="true" className="mt-8 flex flex-col gap-4">
        <span className="sr-only">Loading member…</span>
        {SKELETON_WIDTHS.map((width) => (
          <Skeleton key={width} className={`h-4 ${width}`} />
        ))}
      </div>
    );
  }

  const { member } = data;
  return (
    <>
      {canApproveMember(actor, member) && (
        <div className="mt-6 flex flex-col gap-3 border border-warning/40 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            Applied as {ROLE_LABELS[member.role].toLowerCase()}{' '}
            <RelativeTime iso={member.joinedAt} />.
          </p>
          <Button
            onClick={() => {
              setConfirming(true);
            }}
            aria-haspopup="dialog"
          >
            Approve
          </Button>
        </div>
      )}

      <PanelSection title="Profile">
        <ProfileDetails
          profile={member}
          extra={member.reviewedAt ? [['Approved', DATE.format(new Date(member.reviewedAt))]] : []}
        />
      </PanelSection>

      <PanelSection title="Blogs and comments">
        <AuthorActivity authorId={member.id} />
      </PanelSection>

      <PanelSection title="Invited by">
        {data.referredBy ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-medium">{data.referredBy.name}</span>
            <RoleLabel role={data.referredBy.role} />
          </p>
        ) : (
          <p className="text-sm text-text-muted">No one: a founding admin.</p>
        )}
      </PanelSection>

      <ReferralsSection memberId={member.id} first={data.referrals} />

      <ConfirmDialog
        open={confirming}
        title={`Approve ${member.name}?`}
        confirmLabel="Approve"
        busyLabel="Approving…"
        reason={{ label: 'Note', max: ADMIN_REASON_MAX }}
        onClose={() => {
          setConfirming(false);
        }}
        onConfirm={async (reason) => {
          const updated = await approveMember(member.id, reason);
          record.set(updated);
          setConfirming(false);
          toast.success(`${member.name} is approved. They can post and invite others now.`);
          onApproved(updated);
        }}
      >
        <p>
          {member.name} applied as {ROLE_LABELS[member.role].toLowerCase()}. Approving lets them
          write, comment and invite others with their own code.
        </p>
        <p className="mt-2">The approval is recorded in the activity log.</p>
      </ConfirmDialog>
    </>
  );
}

/** Everyone who joined with this member's code. The first page comes with the record. */
function ReferralsSection({ memberId, first }: { memberId: string; first: ReferralsDto }) {
  const fetchPage = useCallback(
    (cursor: string | null) =>
      cursor === null
        ? Promise.resolve(toReferralsPage(first))
        : fetchMemberReferrals(memberId, cursor),
    [memberId, first],
  );
  const list = usePagedList(fetchPage);
  const total = first.counts.total;

  return (
    <PanelSection title={`Joined with their code · ${plural(total, 'person', 'people')}`}>
      {total > 0 && (
        <>
          <ul className="-mt-3 divide-y divide-border">
            {list.items.map((referral) => (
              <ReferralRow key={referral.id} referral={referral} />
            ))}
          </ul>
          <LoadMoreButton list={list} failureMessage="Couldn’t load more referrals." />
        </>
      )}
    </PanelSection>
  );
}
