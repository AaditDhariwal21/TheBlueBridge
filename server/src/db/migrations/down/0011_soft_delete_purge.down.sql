-- Reverts 0011_soft_delete_purge.sql. Run by hand (Supabase SQL Editor) only after the code
-- that needs it is rolled back, and after the down scripts of any later migrations.
-- Refuses to run while scrubbed placeholders exist: their author and text are gone, so the
-- columns cannot be made NOT NULL again. The pg_cron extension itself is left installed.
-- WARNING: this deletes the purge run log.

begin;

do $$
begin
  if exists (select 1 from public.comments where user_id is null) then
    raise exception 'scrubbed comment placeholders exist; 0011 cannot be reverted';
  end if;
  -- Nested, so cron.job is only looked up where pg_cron is installed.
  if to_regclass('cron.job') is not null then
    if exists (select 1 from cron.job where jobname = 'purge-soft-deleted') then
      perform cron.unschedule('purge-soft-deleted');
    end if;
  end if;
end;
$$;

drop function public.purge_soft_deleted(interval, integer, integer);
drop table public.purge_runs;

drop index public.comments_purge_idx;
drop index public.blogs_purge_idx;
drop index public.comments_blog_idx;

drop index public.comments_top_level_idx;
create index comments_top_level_idx
  on public.comments (blog_id, created_at desc, comment_id desc)
  where parent_comment_id is null;

drop index public.comments_thread_idx;
create index comments_thread_idx
  on public.comments (blog_id, created_at, comment_id);

alter table public.comments
  drop constraint comments_scrubbed_deleted_check,
  drop constraint comments_scrubbed_check,
  alter column body set not null,
  alter column user_id set not null;

delete from public.schema_migrations where name = '0011_soft_delete_purge.sql';

commit;
