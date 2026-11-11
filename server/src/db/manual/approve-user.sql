-- Approve one pending applicant. Run in the Supabase SQL Editor until the admin
-- panel exists. See docs/SUPABASE_SETUP.md, step 9.
--
-- The role stays what they applied for (member or ambassador). reviewed_by is the
-- approving admin, who must be an approved admin. Takes effect on the applicant's
-- next request: the API reads status from the database every time.
-- The result shows the approved row. If it is empty, nothing changed: check both
-- emails, and that the applicant is still pending.

update public.users as applicant
set status      = 'approved',
    reviewed_by = reviewer.user_id,
    reviewed_at = now()
from public.users as reviewer
where applicant.user_id = (select id from auth.users
                           where email = lower('applicant@example.com'))  -- EDIT
  and applicant.status = 'pending'
  and reviewer.user_id = (select id from auth.users
                          where email = lower('admin@example.com'))      -- EDIT
  and reviewer.role = 'admin'
  and reviewer.status = 'approved'
returning applicant.name, applicant.role, applicant.status, applicant.reviewed_at;
