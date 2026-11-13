-- 0007_admin_action_logs.sql
-- The admin action log: an append-only record of what admins did through the admin panel
-- (approvals, Query Blogs started and removed). The API writes each entry in the same
-- transaction as the action it records (features/adminLog/adminLog.service.ts), so an
-- action can never happen without its entry. Ambassador moderation and member actions are
-- not logged here.
--
-- Deliberate audit-log denormalization: target_id is a plain id with no foreign key, and
-- target_label is a snapshot of the target's name or title at the time of the action. A
-- foreign key would block removing the target (or cascade into the log); the snapshot keeps
-- an entry readable after the target is renamed or removed. admin_id is a real foreign key:
-- users are never deleted (references to users never cascade).
-- Reverted by down/0007_admin_action_logs.down.sql.

create table public.admin_action_logs (
  log_id       uuid primary key default gen_random_uuid(),
  admin_id     uuid not null references public.users (user_id) on delete restrict,
  action       text not null,
  target_type  text not null,
  target_id    uuid not null,
  target_label text not null,
  reason       text,
  created_at   timestamptz not null default now(),
  -- A fixed set (text + check rather than an enum, so a later migration can extend it by
  -- replacing this constraint). Mirrored by ADMIN_ACTIONS in src/db/schema.ts.
  constraint admin_action_logs_action_check
    check (action in (
      'member_approved', 'ambassador_approved', 'query_blog_created', 'query_blog_deleted'
    )),
  -- Each action has exactly one kind of target.
  constraint admin_action_logs_target_type_check
    check (
      (action in ('member_approved', 'ambassador_approved') and target_type = 'user')
      or (action in ('query_blog_created', 'query_blog_deleted') and target_type = 'blog')
    ),
  constraint admin_action_logs_target_label_check
    check (target_label = btrim(target_label) and char_length(target_label) between 1 and 200),
  constraint admin_action_logs_reason_check
    check (reason is null or (reason = btrim(reason) and char_length(reason) between 1 and 500))
);

-- ---------------------------------------------------------------- append-only
-- Entries are never changed or removed. The privileges below stop every non-superuser role,
-- including the API's own (the table owner); these triggers also stop superusers, who
-- bypass privileges.
create function public.reject_admin_action_log_change() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'the admin action log is append-only'
    using errcode = 'insufficient_privilege', constraint = 'admin_action_logs_append_only';
end;
$$;
-- New functions are executable by PUBLIC by default; 0004 only revoked the ones it saw.
revoke all on function public.reject_admin_action_log_change() from public, anon, authenticated;

create trigger admin_action_logs_append_only
  before update or delete on public.admin_action_logs
  for each row execute function public.reject_admin_action_log_change();

create trigger admin_action_logs_no_truncate
  before truncate on public.admin_action_logs
  for each statement execute function public.reject_admin_action_log_change();

-- ------------------------------------------------------------------ lockdown
-- Same backstop as 0004, plus no UPDATE/DELETE/TRUNCATE for anyone, the owner included.
alter table public.admin_action_logs enable row level security;
revoke all on public.admin_action_logs from anon, authenticated;
revoke update, delete, truncate on public.admin_action_logs from public, current_user;
do $$
begin
  -- Supabase's secret-key role bypasses RLS; it may not rewrite history either.
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'revoke update, delete, truncate on public.admin_action_logs from service_role';
  end if;
end;
$$;

-- ------------------------------------------------------------------- indexes
-- 15. The Activity Log: every entry, newest first (GET /api/admin/action-logs).
create index admin_action_logs_recent_idx
  on public.admin_action_logs (created_at desc, log_id desc);

-- 16. The Activity Log filtered by admin (?adminId=), newest first. Also serves the
--     admin_id foreign-key check when a user row is deleted.
create index admin_action_logs_admin_idx
  on public.admin_action_logs (admin_id, created_at desc, log_id desc);

-- 17. The Activity Log filtered by action (?action=), newest first.
create index admin_action_logs_action_idx
  on public.admin_action_logs (action, created_at desc, log_id desc);
