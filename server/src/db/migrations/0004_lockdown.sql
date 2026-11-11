-- 0004_lockdown.sql
-- Backstop in case a Supabase key leaks. The Express API connects as the table owner
-- and is the only way in. Supabase's Data API reaches the public schema as the anon
-- and authenticated roles; with RLS enabled, no policies and no privileges, those
-- roles can read and write nothing.
--
-- Every future migration that creates a table must enable RLS on it as well. The
-- default-privilege changes below keep anon/authenticated grants off new objects,
-- and test/integration/lockdown.test.ts fails if any public table has RLS off.

alter table public.categories       enable row level security;
alter table public.users            enable row level security;
alter table public.referral_codes   enable row level security;
alter table public.blogs            enable row level security;
alter table public.comments         enable row level security;
alter table public.blogs_categories enable row level security;
alter table public.user_categories  enable row level security;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- Objects created later by this role (the migration runner's role) get no grants either.
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;
