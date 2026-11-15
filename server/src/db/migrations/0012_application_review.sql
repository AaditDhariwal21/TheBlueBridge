-- 0012_application_review.sql
-- Admins approve or reject an application with a note, shown to the applicant as a "Message
-- from the Blue Bridge team". A rejected applicant may reapply (status back to 'pending',
-- note cleared). users.review_note holds only the latest note; every decision and its note
-- is also kept in the append-only admin action log, so history survives reapplying.
-- Reverted by down/0012_application_review.down.sql.

alter table public.users
  add column review_note text,
  add constraint users_review_note_check
    check (review_note is null or (review_note = btrim(review_note) and char_length(review_note) between 1 and 500));

-- Rejections join the logged actions (mirrored by ADMIN_ACTIONS in src/db/schema.ts).
-- The log's `reason` column holds the note.
alter table public.admin_action_logs
  drop constraint admin_action_logs_action_check,
  add constraint admin_action_logs_action_check
    check (action in (
      'member_approved', 'ambassador_approved', 'member_rejected', 'ambassador_rejected',
      'query_blog_created', 'query_blog_deleted'
    )),
  drop constraint admin_action_logs_target_type_check,
  add constraint admin_action_logs_target_type_check
    check (
      (action in ('member_approved', 'ambassador_approved', 'member_rejected', 'ambassador_rejected')
        and target_type = 'user')
      or (action in ('query_blog_created', 'query_blog_deleted') and target_type = 'blog')
    );

-- 22. One applicant's review history, newest first (GET /api/admin/members/:id).
create index admin_action_logs_target_idx
  on public.admin_action_logs (target_id, created_at desc, log_id desc);
