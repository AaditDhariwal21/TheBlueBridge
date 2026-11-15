-- Reverts 0012_application_review.sql. Run by hand (Supabase SQL Editor) only after the code
-- that needs it is rolled back, and after the down scripts of any later migrations.
-- The log is append-only, so logged rejections stay: the old checks come back NOT VALID
-- (enforced for new rows, not for the rejections already recorded).
-- WARNING: this deletes every user's current review note (the log keeps them).

begin;

drop index public.admin_action_logs_target_idx;

alter table public.admin_action_logs
  drop constraint admin_action_logs_target_type_check,
  add constraint admin_action_logs_target_type_check
    check (
      (action in ('member_approved', 'ambassador_approved') and target_type = 'user')
      or (action in ('query_blog_created', 'query_blog_deleted') and target_type = 'blog')
    ) not valid,
  drop constraint admin_action_logs_action_check,
  add constraint admin_action_logs_action_check
    check (action in (
      'member_approved', 'ambassador_approved', 'query_blog_created', 'query_blog_deleted'
    )) not valid;

alter table public.users drop column review_note;

delete from public.schema_migrations where name = '0012_application_review.sql';

commit;
