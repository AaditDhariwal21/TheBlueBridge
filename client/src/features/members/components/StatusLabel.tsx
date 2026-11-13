import type { ReactNode } from 'react';

import { cn } from '../../../lib/cn';
import { STATUS_LABELS } from '../../auth/labels';
import type { Status } from '../../auth/types';

const STYLE: Record<Status, { tone: string; icon: ReactNode }> = {
  approved: { tone: 'text-success', icon: <path d="m8 12.5 2.5 2.5L16 9.5" /> },
  pending: { tone: 'text-warning', icon: <path d="M12 8v4l2.5 2" /> },
  rejected: { tone: 'text-danger', icon: <path d="M9.5 9.5l5 5M14.5 9.5l-5 5" /> },
  suspended: { tone: 'text-danger', icon: <path d="M8.5 15.5l7-7" /> },
};

/** An account's status as a small icon and its name in the status colour (no box). */
export function StatusLabel({ status }: { status: Status }) {
  const { tone, icon } = STYLE[status];
  return (
    <span
      className={cn('inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap', tone)}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-3.5 shrink-0"
      >
        <circle cx="12" cy="12" r="8.5" />
        {icon}
      </svg>
      {STATUS_LABELS[status]}
    </span>
  );
}
