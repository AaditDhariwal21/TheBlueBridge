import { Avatar } from '../../../components/ui/Avatar';
import { initialsOf } from '../../blogs/lib/text';
import { RoleLabel } from '../../members/components/RoleLabel';
import { StatusLabel } from '../../members/components/StatusLabel';
import type { Referral } from '../types';

/** One person who joined with a code: name, occupation, role and account status. */
export function ReferralRow({ referral }: { referral: Referral }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Avatar
        user={{ id: referral.id, initials: initialsOf(referral.name) }}
        src={referral.avatarUrl}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{referral.name}</p>
        <p className="truncate text-sm text-text-muted">{referral.occupation}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <RoleLabel role={referral.role} />
        <StatusLabel status={referral.status} />
      </div>
    </li>
  );
}
