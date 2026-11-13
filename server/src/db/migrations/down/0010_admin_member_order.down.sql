-- Reverts 0010_admin_member_order.sql. Run by hand (Supabase SQL Editor) only after the code
-- that needs it is rolled back, and after the down scripts of any later migrations.

begin;

create index users_admin_list_idx on public.users (created_at desc, user_id desc);
drop index public.users_admin_directory_idx;
delete from public.schema_migrations where name = '0010_admin_member_order.sql';

commit;
