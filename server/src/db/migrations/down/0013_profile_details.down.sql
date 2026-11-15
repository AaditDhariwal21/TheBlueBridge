-- Reverts 0013_profile_details.sql. Run by hand (Supabase SQL Editor) only after the code
-- that needs it is rolled back, and after the down scripts of any later migrations.
-- The 2-category limit comes back for new rows; ambassadors who already have 3 keep them.
-- WARNING: this deletes every application answer added by 0013.

begin;

drop table public.user_join_reasons;        -- their indexes go with them
drop table public.user_jodhpur_connections;

alter table public.users
  drop column weekly_hours_id,
  drop column join_reason_other,
  drop column connection_other,
  drop column journey_stage_other,
  drop column journey_stage_id,
  drop column linkedin_url,
  drop column profession,
  drop column highest_degree,
  drop column college_name,
  drop column college_pass_year,
  drop column school_name,
  drop column school_pass_year,
  drop column country_code,
  drop column state,
  drop column city,
  drop column maiden_name;

drop table public.weekly_hours_options;
drop table public.join_reasons;
drop table public.journey_stages;
drop table public.jodhpur_connections;

create or replace function public.enforce_user_category_rules() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  owner_role public.user_role;
  area_count integer;
begin
  select role into owner_role
  from public.users
  where user_id = new.user_id
  for no key update;

  if owner_role is distinct from 'ambassador' then
    raise exception 'only ambassadors can have areas'
      using errcode = 'check_violation', constraint = 'user_categories_ambassador_only';
  end if;

  select count(*) into area_count
  from public.user_categories
  where user_id = new.user_id;

  if area_count > 2 then
    raise exception 'an ambassador can have at most 2 areas'
      using errcode = 'check_violation', constraint = 'user_categories_max_two';
  end if;

  return null;
end;
$$;

delete from public.schema_migrations where name = '0013_profile_details.sql';

commit;
