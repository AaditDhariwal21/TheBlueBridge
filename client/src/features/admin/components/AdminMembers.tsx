import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router';

import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Field } from '../../../components/ui/Field';
import { Input } from '../../../components/ui/Input';
import { LoadMoreButton } from '../../../components/ui/LoadMoreButton';
import { SelectMenu } from '../../../components/ui/SelectMenu';
import { Skeleton } from '../../../components/ui/Skeleton';
import { StateMessage } from '../../../components/ui/StateMessage';
import { useDebouncedValue } from '../../../lib/useDebouncedValue';
import { usePagedList, type PagedList } from '../../../lib/usePagedList';
import { ROLE_LABELS } from '../../auth/labels';
import type { Role } from '../../auth/types';
import { initialsOf } from '../../blogs/lib/text';
import { RoleSections } from '../../members/components/RoleSections';
import { StatusLabel } from '../../members/components/StatusLabel';
import { fetchMembers } from '../api';
import type { AdminMember, AdminMemberSummary, MemberStatusFilter } from '../types';
import { AdminMemberDrawer } from './AdminMemberDrawer';

const SEARCH_DEBOUNCE_MS = 300;
const ROLES = Object.keys(ROLE_LABELS) as Role[];

const asStatus = (value: string | null): MemberStatusFilter | null =>
  value === 'pending' || value === 'approved' ? value : null;
const asRole = (value: string): Role | null => ROLES.find((role) => role === value) ?? null;

/**
 * The Community Directory, for admins: everyone of every status, grouped like the community
 * page (admins, ambassadors, members; each by name). Search, filter, open one to act.
 */
export function AdminMembers() {
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  // The overview's "Review applications" link opens this with ?status=pending.
  const [status, setStatus] = useState(() => asStatus(params.get('status')));
  const [role, setRole] = useState<Role | null>(null);
  const [open, setOpen] = useState<AdminMemberSummary | null>(null);
  const q = useDebouncedValue(search.replace(/\s+/g, ' ').trim(), SEARCH_DEBOUNCE_MS);

  const fetchPage = useCallback(
    (cursor: string | null, signal: AbortSignal) =>
      fetchMembers({ q, status, role }, cursor, signal),
    [q, status, role],
  );
  const list = usePagedList(fetchPage);
  const filtered = q !== '' || status !== null || role !== null;

  const clearFilters = () => {
    setSearch('');
    setStatus(null);
    setRole(null);
  };

  const handleApproved = (updated: AdminMember) => {
    const { id } = updated.member;
    list.update((items) =>
      status === 'pending'
        ? items.filter((item) => item.id !== id)
        : items.map((item) => (item.id === id ? { ...item, status: 'approved' } : item)),
    );
  };

  return (
    <section aria-labelledby="admin-members-title">
      <h2 id="admin-members-title" className="text-h2">
        Community Directory
      </h2>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-[1fr_10rem_10rem]">
        <Field label="Search by name or occupation" className="col-span-2 sm:col-span-1">
          {(control) => (
            <Input
              {...control}
              type="search"
              value={search}
              maxLength={100}
              autoComplete="off"
              onChange={(e) => {
                setSearch(e.target.value);
              }}
            />
          )}
        </Field>
        <SelectMenu
          label="Status"
          value={status ?? ''}
          options={[
            { value: '', label: 'Everyone' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
          ]}
          onChange={(value) => {
            setStatus(asStatus(value));
          }}
        />
        <SelectMenu
          label="Role"
          value={role ?? ''}
          options={[
            { value: '', label: 'All roles' },
            ...ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] })),
          ]}
          onChange={(value) => {
            setRole(asRole(value));
          }}
        />
      </div>

      <div className="mt-8">
        <MemberList list={list} filtered={filtered} onClear={clearFilters} onOpen={setOpen} />
      </div>

      <AdminMemberDrawer
        member={open}
        onClose={() => {
          setOpen(null);
        }}
        onApproved={handleApproved}
      />
    </section>
  );
}

function MemberList({
  list,
  filtered,
  onClear,
  onOpen,
}: {
  list: PagedList<AdminMemberSummary, Record<Role, number>>;
  filtered: boolean;
  onClear: () => void;
  onOpen: (member: AdminMemberSummary) => void;
}) {
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
    return (
      <StateMessage
        role="status"
        headingLevel="h3"
        title={filtered ? 'No one matches' : 'No members yet'}
        action={
          filtered && (
            <Button variant="outline" onClick={onClear}>
              Clear filters
            </Button>
          )
        }
      />
    );
  }

  return (
    <div aria-busy={status === 'loading' || undefined}>
      {items.length === 0 ? (
        <div className="flex flex-col gap-2">
          <span className="sr-only">Loading members…</span>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 border border-border bg-surface p-4">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-2 h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <RoleSections
          idPrefix="admin-directory"
          items={items}
          counts={meta}
          dimmed={replacing}
          renderItem={(member) => (
            <button
              type="button"
              onClick={() => {
                onOpen(member);
              }}
              aria-haspopup="dialog"
              className="group flex w-full items-center gap-4 border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-border-strong sm:px-5"
            >
              <Avatar
                user={{ id: member.id, initials: initialsOf(member.name) }}
                src={member.avatarUrl}
                size="lg"
              />
              <span className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-6">
                <span className="block truncate font-medium decoration-accent-soft underline-offset-4 group-hover:underline sm:w-72 sm:shrink-0">
                  {member.name}
                </span>
                <span className="mt-0.5 block truncate text-sm text-text-muted sm:mt-0 sm:flex-1">
                  {member.occupation}
                </span>
              </span>
              <StatusLabel status={member.status} />
            </button>
          )}
        />
      )}
      <LoadMoreButton list={list} failureMessage="Couldn’t load more members." />
    </div>
  );
}
