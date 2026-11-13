-- Reverts 0007_admin_action_logs.sql. Run by hand (Supabase SQL Editor) only after the code
-- that needs it is rolled back, and after the down scripts of any later migrations.
-- WARNING: this deletes the whole admin action log.

begin;

drop table public.admin_action_logs; -- its triggers and indexes go with it
drop function public.reject_admin_action_log_change();
delete from public.schema_migrations where name = '0007_admin_action_logs.sql';

commit;
