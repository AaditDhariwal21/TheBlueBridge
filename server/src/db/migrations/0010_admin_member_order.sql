-- 0010_admin_member_order.sql
-- The admin panel's Community Directory lists everyone (any status) in the community page's
-- order: admins, then ambassadors, then members, each by name. Reverted by
-- down/0010_admin_member_order.down.sql.

-- 18. The admin Community Directory: every user by (role_rank, lower(name), user_id),
--     keyset-paginated on exactly these columns; status, role and name filters drop rows
--     while scanning. (The approved-only directory keeps its partial index, 12.)
create index users_admin_directory_idx
  on public.users (role_rank, lower(name), user_id);

-- 13 served the admin list's old newest-first order, which nothing uses any more.
drop index public.users_admin_list_idx;
