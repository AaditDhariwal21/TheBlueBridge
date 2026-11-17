import { useCallback, useState } from 'react';

import { REVIEW_NOTE_MAX } from '../../../../../shared/limits';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { LoadMoreButton } from '../../../components/ui/LoadMoreButton';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../components/ui/toast';
import { usePagedList } from '../../../lib/usePagedList';
import { useQuery } from '../../../lib/useQuery';
import { ROLE_LABELS } from '../../auth/labels';
import { canReviewApplication } from '../../auth/permissions';
import { AuthorActivity } from '../../blogs/components/mine/MyActivity';
import { RelativeTime } from '../../blogs/components/shared/RelativeTime';
import { plural } from '../../blogs/lib/text';
import { useBlogActor } from '../../blogs/state/viewer';
import { MemberPanel, PanelSection } from '../../members/components/MemberPanel';
import { ProfileDetails } from '../../members/components/ProfileDetails';
import { RoleLabel } from '../../members/components/RoleLabel';
import { StatusLabel } from '../../members/components/StatusLabel';
import { REFERRALS_PAGE_SIZE } from '../../referrals/api';
import { ReferralRow } from '../../referrals/components/ReferralRow';
import { approveMember, fetchMember, fetchMemberReferrals, rejectMember } from '../api';
import { ACTION_LABELS } from '../paths';
import type { AdminActionEntry, AdminMember, AdminMemberSummary } from '../types';

const DATE = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' });
const SKELETON_WIDTHS = ['w-2/3', 'w-1/2', 'w-3/4'] as const;
const NOTE_HINT = `They see it on their account as a message from the Blue Bridge team. Up to ${REVIEW_NOTE_MAX} characters; also kept in the activity log.`;

interface AdminMemberDrawerProps {
  /** The row that was opened: shown at once while the full record loads. */
  member: AdminMemberSummary | null;
  onClose: () => void;
  /** After an approval or rejection, with the updated record. */
  onReviewed: (member: AdminMember) => void;
}

/**
 * One member, for admins, in the same side panel the community directory uses: the whole
 * application, earlier decisions with their notes, blogs and comments, who invited them, who
 * used their code, and Approve / Reject while they are waiting.
 */
export function AdminMemberDrawer({ member, onClose, onReviewed }: AdminMemberDrawerProps) {
  const [decided, setDecided] = useState<AdminMember['member'] | null>(null);
  const status = decided !== null && decided.id === member?.id ? decided.status : member?.status;
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
          onReviewed={(updated) => {
            setDecided(updated.member);
            onReviewed(updated);
          }}
        />
      )}
    </MemberPanel>
  );
}

type Decision = 'approve' | 'reject';

function MemberRecord({
  id,
  onReviewed,
}: {
  id: string;
  onReviewed: (member: AdminMember) => void;
}) {
  const record = useQuery(`admin/members/${id}`, (signal) => fetchMember(id, signal));
  const actor = useBlogActor();
  const toast = useToast();
  const [deciding, setDeciding] = useState<Decision | null>(null);
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

  const { member, history } = data;
  const role = ROLE_LABELS[member.role].toLowerCase();
  const reapplied = history.some((entry) => entry.action.endsWith('_rejected'));
  const decide = async (decision: Decision, note: string | null) => {
    const updated =
      decision === 'approve'
        ? await approveMember(member.id, note)
        : await rejectMember(member.id, note ?? '');
    record.set(updated);
    setDeciding(null);
    toast.success(
      decision === 'approve'
        ? `${member.name} is approved. They can post and invite others now.`
        : `${member.name}’s application was not approved. They’ll see your message when they sign in.`,
    );
    onReviewed(updated);
  };

  return (
    <>
      {canReviewApplication(actor, member) && (
        <div className="mt-6 flex flex-col gap-3 border border-warning/40 bg-surface p-4">
          <p className="text-sm">
            {reapplied ? 'Applied again' : 'Applied'} as {role}. Joined{' '}
            <RelativeTime iso={member.joinedAt} />.
            {reapplied && ' Earlier decisions are under “Decisions”.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setDeciding('approve');
              }}
              aria-haspopup="dialog"
            >
              Approve
            </Button>
            <Button
              variant="danger-outline"
              onClick={() => {
                setDeciding('reject');
              }}
              aria-haspopup="dialog"
            >
              Reject
            </Button>
          </div>
        </div>
      )}

      <PanelSection title="Profile">
        <ProfileDetails
          profile={member}
          extra={[
            ...(member.reviewedAt
              ? [['Decided', DATE.format(new Date(member.reviewedAt))] as [string, string]]
              : []),
            ...(member.reviewNote
              ? [['Message to them', member.reviewNote] as [string, string]]
              : []),
          ]}
        />
      </PanelSection>

      <PanelSection title="Decisions">
        <DecisionHistory entries={history} />
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

      <ReferralsSection memberId={member.id} total={data.referrals.counts.total} />

      <ConfirmDialog
        open={deciding === 'approve'}
        title={`Approve ${member.name}?`}
        confirmLabel="Approve"
        busyLabel="Approving…"
        reason={{ label: 'Message to them (optional)', max: REVIEW_NOTE_MAX, hint: NOTE_HINT }}
        onClose={() => {
          setDeciding(null);
        }}
        onConfirm={(note) => decide('approve', note)}
      >
        <p>
          {member.name} applied as {role}. Approving lets them write, comment and invite others with
          their own code.
        </p>
        <p className="mt-2">The approval is recorded in the activity log.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={deciding === 'reject'}
        title={`Reject ${member.name}’s application?`}
        confirmLabel="Reject"
        busyLabel="Rejecting…"
        tone="danger"
        reason={{
          label: 'Message to them',
          max: REVIEW_NOTE_MAX,
          required: true,
          hint: `Required: say why, and what would help if they apply again. ${NOTE_HINT}`,
        }}
        onClose={() => {
          setDeciding(null);
        }}
        onConfirm={(note) => decide('reject', note)}
      >
        <p>
          They can still sign in. They’ll see your message and can apply again, in the same or a
          different role.
        </p>
      </ConfirmDialog>
    </>
  );
}

/** Earlier approvals and rejections, newest first, each with who decided and the note. */
function DecisionHistory({ entries }: { entries: readonly AdminActionEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-text-muted">No decisions yet.</p>;
  }
  return (
    <ol className="-mt-1 flex flex-col divide-y divide-border">
      {entries.map((entry) => (
        <li key={entry.id} className="py-3 text-sm">
          <p>
            <span className="font-medium">{entry.admin.name}</span>{' '}
            {ACTION_LABELS[entry.action].verb}{' '}
            <span className="text-text-muted">· {DATE.format(new Date(entry.createdAt))}</span>
          </p>
          {entry.reason && (
            <p className="mt-1 border-l-2 border-border pl-3 wrap-break-word whitespace-pre-line text-text-muted">
              {entry.reason}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Everyone who joined with this member's code. */
function ReferralsSection({ memberId, total }: { memberId: string; total: number }) {
  const fetchPage = useCallback(
    (cursor: string | null, limit: number, signal: AbortSignal) =>
      fetchMemberReferrals(memberId, cursor, limit, signal),
    [memberId],
  );
  const list = usePagedList(`admin/members/${memberId}/referrals`, fetchPage, {
    pageSize: REFERRALS_PAGE_SIZE,
  });

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
