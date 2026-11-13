import type { ReactNode } from 'react';

import { cn } from '../../../../lib/cn';
import type { User } from '../../model/types';
import { Avatar, type AvatarSize } from '../../../../components/ui/Avatar';
import { RelativeTime } from './RelativeTime';

interface AuthorBylineProps {
  author: User;
  createdAt: string;
  size?: AvatarSize;
  /** Extra inline content after the name, e.g. an "Author" tag. */
  badge?: ReactNode;
  className?: string;
}

/** Avatar, name · time, and profession on the line below. Truncates gracefully. */
export function AuthorByline({
  author,
  createdAt,
  size = 'md',
  badge,
  className,
}: AuthorBylineProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <Avatar user={author} size={size} />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-baseline gap-x-1.5 text-sm">
          <span className="truncate font-medium text-text">{author.name}</span>
          {badge}
          <span aria-hidden="true" className="text-text-muted">
            ·
          </span>
          <RelativeTime iso={createdAt} className="text-text-muted" />
        </p>
        <p className="truncate text-xs text-text-muted">{author.profession}</p>
      </div>
    </div>
  );
}
