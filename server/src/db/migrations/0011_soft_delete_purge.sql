-- 0011_soft_delete_purge.sql
-- Deleting a blog or a comment is a soft delete (deleted_at, deleted_by, set since 0001).
-- Thirty days later public.purge_soft_deleted() removes the data for good:
--   * a blog is hard-deleted; its comments and category links go with it (ON DELETE CASCADE);
--   * a comment with no replies left is hard-deleted;
--   * a comment that still has replies keeps its row as a placeholder, but its text and
--     author are erased ("scrubbed"); it is hard-deleted by a later run, once its last reply
--     is gone.
-- pg_cron runs it every day at 03:00 IST, and each run records what it removed in
-- public.purge_runs. Reverted by down/0011_soft_delete_purge.down.sql.

-- ------------------------------------------------------------ scrubbed comments
-- A scrubbed placeholder has neither author nor text; only a deleted comment is scrubbed.
alter table public.comments
  alter column user_id drop not null,
  alter column body drop not null,
  add constraint comments_scrubbed_check
    check ((user_id is null) = (body is null)),
  add constraint comments_scrubbed_deleted_check
    check (user_id is not null or deleted_at is not null);

-- ------------------------------------------------------------------- indexes
-- 4. (replaced) A blog's live thread in posting order, live comment counts per blog and a
--    Query Blog's last activity. Deleted comments are fetched only as placeholders, by
--    primary key, when a live reply hangs from them (comments.repository.ts, selectThread).
drop index public.comments_thread_idx;
create index comments_thread_idx
  on public.comments (blog_id, created_at, comment_id)
  where deleted_at is null;

-- 5. (replaced) Live queries under a Query Blog (its live top-level comments), and their count.
drop index public.comments_top_level_idx;
create index comments_top_level_idx
  on public.comments (blog_id, created_at desc, comment_id desc)
  where parent_comment_id is null and deleted_at is null;

-- 19. Every comment of a blog, live or not: the ON DELETE CASCADE when a blog is purged.
create index comments_blog_idx
  on public.comments (blog_id);

-- 20. The purge: blogs deleted before the cutoff, oldest first.
create index blogs_purge_idx
  on public.blogs (deleted_at)
  where deleted_at is not null;

-- 21. The purge: comments deleted before the cutoff, oldest first.
create index comments_purge_idx
  on public.comments (deleted_at)
  where deleted_at is not null;

-- ------------------------------------------------------------------ run log
-- One row per purge run, for checking that the schedule works and what it removed. About 365
-- rows a year, read by hand (order by run_id desc), so no index beyond the primary key.
create table public.purge_runs (
  run_id                bigint generated always as identity primary key,
  started_at            timestamptz not null,
  finished_at           timestamptz not null,
  -- Rows deleted before this moment were eligible.
  cutoff                timestamptz not null,
  blogs_deleted         integer not null,
  -- Comments removed with those blogs (ON DELETE CASCADE).
  blog_comments_deleted integer not null,
  comments_deleted      integer not null,
  comments_scrubbed     integer not null,
  -- False when the run stopped at its batch budget with work left (the next run continues).
  complete              boolean not null,
  constraint purge_runs_counts_check
    check (least(blogs_deleted, blog_comments_deleted, comments_deleted, comments_scrubbed) >= 0),
  constraint purge_runs_timestamps_check
    check (finished_at >= started_at)
);

alter table public.purge_runs enable row level security;
revoke all on public.purge_runs from anon, authenticated;

-- ------------------------------------------------------------------ the purge
-- Idempotent: anything already purged is simply not found again. Works in batches of
-- `batch_size` rows, skipping rows another transaction holds (they wait for the next run), and
-- stops after `max_batches` statements so one run stays bounded. Children go before parents:
-- deleting the replies of a removed comment turns it into a leaf, which a later batch deletes.
-- Concurrent calls do nothing (advisory lock) and return null.
create function public.purge_soft_deleted(
  retention   interval default interval '30 days',
  batch_size  integer  default 500,
  max_batches integer  default 200
) returns public.purge_runs
language plpgsql
set search_path = ''
as $$
declare
  v_started  timestamptz := clock_timestamp();
  v_cutoff   timestamptz := now() - retention;
  v_batches  integer := 0;
  v_affected integer;
  v_cascaded integer;
  v_blogs    integer := 0;
  v_cascade  integer := 0;
  v_comments integer := 0;
  v_scrubbed integer := 0;
  v_run      public.purge_runs;
begin
  if retention < interval '0' or batch_size < 1 or max_batches < 1 then
    raise exception 'purge_soft_deleted: retention must be >= 0, batch sizes >= 1'
      using errcode = 'invalid_parameter_value';
  end if;
  if not pg_try_advisory_xact_lock(hashtext('public.purge_soft_deleted')) then
    return null;
  end if;

  -- 1. Blogs, with their comments and category links.
  loop
    exit when v_batches >= max_batches;
    with doomed as (
      select b.blog_id
      from public.blogs b
      where b.deleted_at < v_cutoff
      order by b.deleted_at
      limit batch_size
      for update skip locked
    ),
    removed_comments as (
      select count(*)::integer as n from public.comments c where c.blog_id in (select blog_id from doomed)
    ),
    removed as (
      delete from public.blogs b using doomed d where b.blog_id = d.blog_id returning b.blog_id
    )
    select (select count(*)::integer from removed), (select n from removed_comments)
    into v_affected, v_cascaded;
    v_batches := v_batches + 1;
    v_blogs := v_blogs + v_affected;
    v_cascade := v_cascade + v_cascaded;
    exit when v_affected < batch_size;
  end loop;

  -- 2. Comments with no replies left, leaves first. Repeats until nothing more goes, because
  --    each pass can turn removed parents into leaves.
  loop
    exit when v_batches >= max_batches;
    with doomed as (
      select c.comment_id
      from public.comments c
      where c.deleted_at < v_cutoff
        and not exists (select 1 from public.comments r where r.parent_comment_id = c.comment_id)
      order by c.deleted_at
      limit batch_size
      for update skip locked
    )
    delete from public.comments c using doomed d where c.comment_id = d.comment_id;
    get diagnostics v_affected = row_count;
    v_batches := v_batches + 1;
    v_comments := v_comments + v_affected;
    exit when v_affected = 0;
  end loop;

  -- 3. Comments that still hold replies: keep the placeholder, erase text and author.
  loop
    exit when v_batches >= max_batches;
    with doomed as (
      select c.comment_id
      from public.comments c
      where c.deleted_at < v_cutoff and c.user_id is not null
      order by c.deleted_at
      limit batch_size
      for update skip locked
    )
    update public.comments c
    set user_id = null, body = null
    from doomed d
    where c.comment_id = d.comment_id;
    get diagnostics v_affected = row_count;
    v_batches := v_batches + 1;
    v_scrubbed := v_scrubbed + v_affected;
    exit when v_affected < batch_size;
  end loop;

  insert into public.purge_runs (
    started_at, finished_at, cutoff, blogs_deleted, blog_comments_deleted,
    comments_deleted, comments_scrubbed, complete
  )
  values (
    v_started, clock_timestamp(), v_cutoff, v_blogs, v_cascade,
    v_comments, v_scrubbed, v_batches < max_batches
  )
  returning * into v_run;

  raise log 'purge_soft_deleted: % blogs (% of their comments), % comments deleted, % scrubbed',
    v_blogs, v_cascade, v_comments, v_scrubbed;
  return v_run;
end;
$$;
-- New functions are executable by PUBLIC by default.
revoke all on function public.purge_soft_deleted(interval, integer, integer)
  from public, anon, authenticated;

-- ------------------------------------------------------------------ schedule
-- Every day at 03:00 IST (21:30 UTC). pg_cron only runs in the database named by its
-- cron.database_name setting, which exists only where pg_cron is preloaded (Supabase: the
-- `postgres` database). Elsewhere, e.g. the test database, nothing is scheduled.
-- cron.schedule replaces a job of the same name, so re-running this is harmless.
do $$
begin
  if current_setting('cron.database_name', true) = current_database() then
    create extension if not exists pg_cron;
    perform cron.schedule(
      'purge-soft-deleted',
      '30 21 * * *',
      'select public.purge_soft_deleted()'
    );
  else
    raise notice 'pg_cron is not available in this database; purge_soft_deleted() is not scheduled';
  end if;
end;
$$;
