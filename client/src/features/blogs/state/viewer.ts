import { useMemo } from 'react';

import { useAuth } from '../../auth/authContext';
import type { Actor } from '../../auth/permissions';
import { initialsOf } from '../lib/text';
import type { User } from '../model/types';

/** The signed-in member as the Blogs section displays people. Null when signed out. */
export function useViewerAuthor(): User | null {
  const { state } = useAuth();
  const me = state.status === 'signedIn' ? state.me : null;
  return useMemo(
    () =>
      me && { id: me.id, name: me.name, profession: me.occupation, initials: initialsOf(me.name) },
    [me],
  );
}

/** The signed-in member for permission checks (features/auth/permissions.ts). */
export function useBlogActor(): Actor | null {
  const { state } = useAuth();
  const me = state.status === 'signedIn' ? state.me : null;
  return useMemo(
    () =>
      me && {
        id: me.id,
        role: me.role,
        status: me.status,
        categoryIds: me.categories.map((category) => category.id),
      },
    [me],
  );
}
