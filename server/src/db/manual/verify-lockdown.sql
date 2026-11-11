-- Confirms the leaked-key backstop. Run in the Supabase SQL Editor after migrating.
-- Expected: the first query returns no rows (every public table has RLS on),
-- and the second returns no rows (anon/authenticated hold no table privileges).

select c.relname as table_without_rls
from pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relkind = 'r'
  and not c.relrowsecurity;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated');
