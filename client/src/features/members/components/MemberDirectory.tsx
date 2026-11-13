import { useCallback, useState } from 'react';

import { Container } from '../../../components/layout/Container';
import { Section } from '../../../components/layout/Section';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { LoadMoreButton } from '../../../components/ui/LoadMoreButton';
import { SearchFilterBar } from '../../../components/ui/SearchFilterBar';
import { Skeleton } from '../../../components/ui/Skeleton';
import { StateMessage } from '../../../components/ui/StateMessage';
import { useDebouncedValue } from '../../../lib/useDebouncedValue';
import { usePagedList, type PagedList } from '../../../lib/usePagedList';
import { useAuth } from '../../auth/authContext';
import type { Role } from '../../auth/types';
import { JoinPrompt } from '../../blogs/components/shared/JoinPrompt';
import { initialsOf, plural } from '../../blogs/lib/text';
import { useAsync } from '../../../lib/useAsync';
import {
  DIRECTORY_SEARCH_RULES,
  fetchCommunitySize,
  fetchDirectoryPage,
  type DirectoryCounts,
} from '../api';
import type { MemberSummary } from '../types';
import { MemberProfilePanel } from './MemberProfilePanel';
import { ROLE_SECTIONS } from '../roles';
import { RoleSections } from './RoleSections';

const isRole = (id: string): id is Role => ROLE_SECTIONS.some((s) => s.role === id);

/**
 * The member directory, below the Community page's introduction: one search and role
 * filter, then the people grouped as Admins, Ambassadors and Members (search results stay
 * in their groups). It carries contact details, so only approved members see it.
 */
export function MemberDirectory() {
  const { state } = useAuth();
  const me = state.status === 'signedIn' ? state.me : null;

  return (
    <Section aria-labelledby="directory-title" className="border-t border-border">
      <Container>
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-reading">
            <h2 id="directory-title" className="text-h2 tracking-tight">
              The community
            </h2>
            <div
              aria-hidden="true"
              className="mt-4 h-px w-24 bg-linear-to-r from-accent-soft to-accent-2-soft"
            />
            <p className="mt-4 text-text-muted">
              Admins, ambassadors and members of The Blue Bridge. Open a profile to get in touch.
            </p>
          </div>
          <CommunitySize />
        </header>
        <div className="mt-8">
          {me?.status === 'approved' ? (
            <Directory viewerId={me.id} />
          ) : (
            <JoinPrompt action="see the member directory" />
          )}
        </div>
      </Container>
    </Section>
  );
}

/** "We're 78 strong": approved admins, ambassadors and members. Shown to everyone. */
function CommunitySize() {
  const size = useAsync(fetchCommunitySize);
  if (size.status === 'error') return null;
  return (
    <p className="flex shrink-0 items-baseline gap-2" aria-busy={size.status === 'loading'}>
      {size.data === undefined ? (
        <Skeleton className="h-10 w-28" />
      ) : (
        <>
          <span className="text-text-muted">We’re</span>
          <span className="font-display text-h1 leading-none text-accent-2">
            {size.data.toLocaleString('en-IN')}
          </span>
          <span className="text-text-muted">strong, and growing.</span>
        </>
      )}
    </p>
  );
}

function Directory({ viewerId }: { viewerId: string }) {
  const [query, setQuery] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const typed = query.replace(/\s+/g, ' ').trim();
  const settled = useDebouncedValue(typed, DIRECTORY_SEARCH_RULES.debounceMs);
  // Clearing the box shows everyone at once; new words wait for the pause in typing.
  const min = DIRECTORY_SEARCH_RULES.queryMin;
  const q = typed.length >= min && settled.length >= min ? settled : '';

  const roleKey = ROLE_SECTIONS.filter((s) => roles.includes(s.role))
    .map((s) => s.role)
    .join(',');
  const fetchPage = useCallback(
    (cursor: string | null, signal: AbortSignal) =>
      fetchDirectoryPage(
        { q, roles: roleKey ? roleKey.split(',').filter(isRole) : [] },
        cursor,
        signal,
      ),
    [q, roleKey],
  );
  const list = usePagedList(fetchPage);
  const filtered = q !== '' || roles.length > 0;

  const clear = () => {
    setQuery('');
    setRoles([]);
  };

  return (
    <>
      <SearchFilterBar
        label="Member directory"
        placeholder="Search by name or occupation"
        hint={`Results update as you type, from ${min} characters.`}
        maxLength={DIRECTORY_SEARCH_RULES.queryMax}
        query={query}
        onQueryChange={setQuery}
        filter={{
          label: 'Filter by role',
          shortLabel: 'Filter',
          title: 'Roles',
          options: ROLE_SECTIONS.map((s) => ({ id: s.role, label: s.title })),
          onRetry: () => undefined,
          value: roles,
          onChange: (ids) => {
            setRoles(ids.filter(isRole));
          },
        }}
      />
      <div className="mt-8">
        <DirectoryResults viewerId={viewerId} list={list} filtered={filtered} onClear={clear} />
      </div>
    </>
  );
}

function DirectoryResults({
  viewerId,
  list,
  filtered,
  onClear,
}: {
  viewerId: string;
  list: PagedList<MemberSummary, DirectoryCounts>;
  filtered: boolean;
  onClear: () => void;
}) {
  const [open, setOpen] = useState<MemberSummary | null>(null);
  const { items, status, hasMore, meta } = list;
  const replacing = status === 'loading' && !hasMore && items.length > 0;

  if (status === 'error' && items.length === 0) {
    return (
      <StateMessage
        role="alert"
        headingLevel="h3"
        title="The directory didn’t load"
        action={
          <Button variant="outline" onClick={list.retry}>
            Try again
          </Button>
        }
      >
        Check your connection and try again.
      </StateMessage>
    );
  }
  if (status === 'ready' && items.length === 0) {
    return filtered ? (
      <StateMessage
        role="status"
        headingLevel="h3"
        title="No one matches"
        action={
          <Button variant="outline" onClick={onClear}>
            Clear filters
          </Button>
        }
      >
        Try another name or occupation, or fewer roles.
      </StateMessage>
    ) : (
      <StateMessage headingLevel="h3" title="No members yet" />
    );
  }
  if (items.length === 0) return <DirectorySkeleton />;

  const total = meta ? meta.admin + meta.ambassador + meta.member : null;

  return (
    <div aria-busy={status === 'loading' || undefined}>
      {filtered && total !== null && (
        <p role="status" className="mb-6 text-sm text-text-muted">
          {plural(total, 'person', 'people')} found
        </p>
      )}
      <RoleSections
        idPrefix="directory"
        items={items}
        counts={meta}
        dimmed={replacing}
        renderItem={(member) => (
          <MemberCard
            member={member}
            isViewer={member.id === viewerId}
            onOpen={() => {
              setOpen(member);
            }}
          />
        )}
      />
      <LoadMoreButton list={list} failureMessage="Couldn’t load more members." />
      <MemberProfilePanel
        viewerId={viewerId}
        member={open}
        onClose={() => {
          setOpen(null);
        }}
      />
    </div>
  );
}

/** One person: a full-width row card that opens their profile. */
function MemberCard({
  member,
  isViewer,
  onOpen,
}: {
  member: MemberSummary;
  isViewer: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className="group relative flex w-full items-center gap-4 border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-border-strong active:bg-bg sm:px-5"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 -left-px w-0.5 origin-top scale-y-0 bg-linear-to-b from-accent-soft to-accent-2-soft transition-transform duration-(--duration-base) group-hover:scale-y-100 group-focus-visible:scale-y-100"
      />
      <Avatar
        user={{ id: member.id, initials: initialsOf(member.name) }}
        src={member.avatarUrl}
        size="lg"
      />
      <span className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-6">
        <span className="block truncate font-medium sm:w-72 sm:shrink-0">
          <span className="decoration-accent-soft underline-offset-4 group-hover:underline">
            {member.name}
          </span>
          {isViewer && <span className="ml-1.5 text-sm font-normal text-text-muted">(You)</span>}
        </span>
        <span className="mt-0.5 block truncate text-sm text-text-muted sm:mt-0 sm:flex-1">
          {member.occupation}
        </span>
      </span>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="size-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-text"
      >
        <path d="m9 6 6 6-6 6" />
      </svg>
    </button>
  );
}

function DirectorySkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-10">
      <span className="sr-only">Loading members…</span>
      {[2, 3].map((rows, i) => (
        <div key={i}>
          <Skeleton className="h-6 w-32" />
          <div className="mt-3 flex flex-col gap-2">
            {Array.from({ length: rows }, (_, j) => (
              <div
                key={j}
                className="flex items-center gap-4 border border-border bg-surface px-5 py-3"
              >
                <Skeleton className="size-11 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="hidden h-3 w-32 sm:block" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
