-- 0008_member_directory.sql
-- The member directory (GET /api/members) and the admin member list (GET /api/admin/members).
-- Reverted by down/0008_member_directory.down.sql.

-- The directory lists admins, then ambassadors, then members. The rank is spelled out here
-- instead of relying on user_role's declaration order, so reordering or extending the enum
-- can never silently reorder the directory.
alter table public.users
  add column role_rank smallint generated always as (
    case role when 'admin' then 0 when 'ambassador' then 1 else 2 end
  ) stored;

-- 12. The member directory: approved users by role rank, then name (case-insensitive), then
--     id as the tiebreaker, keyset-paginated on exactly these columns:
--       where status = 'approved' and (role_rank, lower(name), user_id) > (…)
--       order by role_rank, lower(name), user_id
--     A later name search or role filter adds predicates on this same order and index.
create index users_directory_idx
  on public.users (role_rank, lower(name), user_id)
  where status = 'approved';

-- 13. The admin member list: everyone, newest first, keyset-paginated on (created_at,
--     user_id). Role and name filters are applied while scanning; "pending only" can use
--     users_pending_queue_idx (10) backwards instead.
create index users_admin_list_idx
  on public.users (created_at desc, user_id desc);
