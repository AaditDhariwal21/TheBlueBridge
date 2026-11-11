-- Create the first (root) admin. Run ONCE in the Supabase SQL Editor.
-- See docs/SUPABASE_SETUP.md, step 8.
--
-- Before running:
--   1. Authentication > Users > Add user > Create new user, with "Auto Confirm User" ticked.
--   2. Replace the four values marked EDIT below.
--
-- The root admin signed up with no referral code (referral_code_id stays null),
-- so the users <-> referral_codes circular reference never comes into play:
-- the profile is inserted first, then the admin's own (root) referral code.
-- The result shows that code. If the result is empty, the email did not match
-- an Auth user.

with auth_user as (
  select id from auth.users
  where email = lower('admin@example.com')                 -- EDIT: the Auth user's email
),
profile as (
  insert into public.users (user_id, name, phone_number, occupation, role, status)
  select id,
         'Your Name',                                      -- EDIT: full name
         '+919876543210',                                  -- EDIT: phone, E.164 (+ country code)
         'Founder',                                        -- EDIT: occupation
         'admin',
         'approved'
  from auth_user
  returning user_id
)
insert into public.referral_codes (user_id, code)
select user_id,
       -- 10 characters from the same look-alike-free alphabet the API uses.
       -- Each character comes from a fresh gen_random_uuid() (cryptographic randomness).
       (select string_agg(
                 substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ',
                        1 + get_byte(uuid_send(gen_random_uuid()), 0) % 31, 1), '')
        from generate_series(1, 10))
from profile
returning code as root_referral_code;
