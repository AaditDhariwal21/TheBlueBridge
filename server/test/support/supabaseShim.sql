-- Stand-ins for the parts of Supabase the migrations depend on, for the disposable
-- test database only. Never run this against a Supabase project.

-- Roles are cluster-wide and test files run in parallel, so tolerate a race.
do $$
begin
  begin create role anon nologin;
  exception when duplicate_object or unique_violation then null;
  end;
  begin create role authenticated nologin;
  exception when duplicate_object or unique_violation then null;
  end;
end;
$$;

create schema auth;
create table auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text not null unique
);

-- Supabase grants the API roles access to public by default. Copy that, so the
-- lockdown migration is tested against the same starting point.
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
