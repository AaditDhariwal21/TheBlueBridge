import type { ReactNode } from 'react';

import { cn } from '../../../../lib/cn';

/** Line icons in the site's style: 24px grid, 1.5 stroke, round joins. Always decorative. */
function Icon({ className, children }: { className?: string | undefined; children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-4 shrink-0', className)}
    >
      {children}
    </svg>
  );
}

interface IconProps {
  className?: string;
}

export const CommentIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M20 12.5c0 3.6-3.6 6.5-8 6.5-1.1 0-2.2-.2-3.1-.5L4 20l1.4-3.6C4.5 15.3 4 14 4 12.5 4 8.9 7.6 6 12 6s8 2.9 8 6.5Z" />
  </Icon>
);

export const ClockIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l2.5 2" />
  </Icon>
);

export const PenIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
    <path d="M13.5 6.5l4 4" />
  </Icon>
);

export const PinIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M9 4h6l-1 6 3 3H7l3-3-1-6Z" />
    <path d="M12 13v7" />
  </Icon>
);

export const ArrowLeftIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
);

export const ArrowRightIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);

export const ReplyIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M9 7 4 12l5 5" />
    <path d="M4 12h9a7 7 0 0 1 7 7" />
  </Icon>
);

/** The "replying to" marker: a small down-right elbow. */
export const ElbowIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M6 4v7a3 3 0 0 0 3 3h9M14 10l4 4-4 4" />
  </Icon>
);

export const PlusIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const CloseIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const ChevronDownIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);
