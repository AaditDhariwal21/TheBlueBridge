-- Reverts 0008_member_directory.sql. Run by hand (Supabase SQL Editor) only after the code
-- that needs it is rolled back, and after the down scripts of any later migrations.

begin;

drop index public.users_admin_list_idx;
drop index public.users_directory_idx;
alter table public.users drop column role_rank;
delete from public.schema_migrations where name = '0008_member_directory.sql';

commit;
