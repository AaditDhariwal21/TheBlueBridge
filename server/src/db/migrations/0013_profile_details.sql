-- 0013_profile_details.sql
-- The expanded membership application: where she lives, her Jodhpur connection, education
-- and work, where she is in her journey, why she is joining and (ambassadors) the hours a
-- week she can offer. Reverted by down/0013_profile_details.down.sql.
--
-- * Option sets are small lookup tables, so an option can be added, relabelled, reordered
--   or retired (active = false) with plain SQL, without a code change. The API refers to
--   options by `code` (stable); `label` is what people read. The code 'other' asks for free
--   text, kept in one nullable column per question on users (never indexed or searched).
-- * Multi-select answers are junction tables; single-choice answers are foreign keys on users.
-- * Existing users have none of this yet, so every new column is nullable. The API requires
--   the answers on every new application and reapplication (features/users/users.schemas.ts).
-- * An ambassador may now choose up to 3 categories (was 2).

-- ----------------------------------------------------------------- option sets
create table public.jodhpur_connections (
  connection_id smallint generated always as identity primary key,
  code          text not null,
  label         text not null,
  sort_order    smallint not null,
  active        boolean not null default true,
  constraint jodhpur_connections_code_key unique (code),
  constraint jodhpur_connections_code_check check (code ~ '^[a-z0-9_]{1,40}$'),
  constraint jodhpur_connections_label_check
    check (label = btrim(label) and char_length(label) between 1 and 120)
);

create table public.journey_stages (
  journey_stage_id smallint generated always as identity primary key,
  code             text not null,
  label            text not null,
  sort_order       smallint not null,
  active           boolean not null default true,
  constraint journey_stages_code_key unique (code),
  constraint journey_stages_code_check check (code ~ '^[a-z0-9_]{1,40}$'),
  constraint journey_stages_label_check
    check (label = btrim(label) and char_length(label) between 1 and 120)
);

create table public.join_reasons (
  join_reason_id smallint generated always as identity primary key,
  code           text not null,
  label          text not null,
  sort_order     smallint not null,
  active         boolean not null default true,
  constraint join_reasons_code_key unique (code),
  constraint join_reasons_code_check check (code ~ '^[a-z0-9_]{1,40}$'),
  constraint join_reasons_label_check
    check (label = btrim(label) and char_length(label) between 1 and 120)
);

create table public.weekly_hours_options (
  weekly_hours_id smallint generated always as identity primary key,
  code            text not null,
  label           text not null,
  sort_order      smallint not null,
  active          boolean not null default true,
  constraint weekly_hours_options_code_key unique (code),
  constraint weekly_hours_options_code_check check (code ~ '^[a-z0-9_]{1,40}$'),
  constraint weekly_hours_options_label_check
    check (label = btrim(label) and char_length(label) between 1 and 120)
);

insert into public.jodhpur_connections (code, label, sort_order) values
  ('born_here', 'Born here', 1),
  ('grew_up_here', 'Grew up here', 2),
  ('family_roots', 'Family roots', 3),
  ('educated_here', 'Educated here', 4),
  ('live_here', 'Currently live here', 5),
  ('work_connection', 'Work or business connection', 6),
  ('other', 'Other', 7);

insert into public.journey_stages (code, label, sort_order) values
  ('student', 'Student', 1),
  ('early_career', 'Early career (1–3 years)', 2),
  ('mid_career', 'Mid career (3–10 years)', 3),
  ('senior', 'Senior professional', 4),
  ('independent', 'Independent professional', 5),
  ('entrepreneur', 'Entrepreneur or business owner', 6),
  ('career_break', 'Career break, or exploring a return to work', 7),
  ('retired', 'Retired', 8),
  ('other', 'Other', 9);

insert into public.join_reasons (code, label, sort_order) values
  ('network', 'Expanding my professional network', 1),
  ('mentorship', 'Mentorship opportunities', 2),
  ('career_guidance', 'Career guidance', 3),
  ('business', 'Business opportunities', 4),
  ('give_back', 'Giving back to my Jodhpur community, or finding purpose', 5),
  ('kids_education', 'Information for my children’s education', 6),
  ('other', 'Other', 7);

insert into public.weekly_hours_options (code, label, sort_order) values
  ('1_2', '1–2 hours', 1),
  ('3_5', '3–5 hours', 2),
  ('6_10', '6–10 hours', 3),
  ('10_plus', 'More than 10 hours', 4);

-- ------------------------------------------------------------- users' answers
alter table public.users
  add column maiden_name         text,
  add column city                text,
  add column state               text,
  -- ISO 3166-1 alpha-2; the list lives in shared/countries.ts.
  add column country_code        text,
  add column school_pass_year    smallint,
  add column school_name         text,
  -- A year, or 'NA' (e.g. no college). NULL means "not answered yet" (existing users).
  add column college_pass_year   text,
  add column college_name        text,
  add column highest_degree      text,
  add column profession          text,
  add column linkedin_url        text,
  add column journey_stage_id    smallint
    constraint users_journey_stage_id_fkey
    references public.journey_stages (journey_stage_id) on delete restrict,
  add column journey_stage_other text,
  add column connection_other    text,
  add column join_reason_other   text,
  add column weekly_hours_id     smallint
    constraint users_weekly_hours_id_fkey
    references public.weekly_hours_options (weekly_hours_id) on delete restrict,
  add constraint users_maiden_name_check
    check (maiden_name = btrim(maiden_name) and char_length(maiden_name) between 1 and 100),
  add constraint users_city_check
    check (city = btrim(city) and char_length(city) between 1 and 100),
  add constraint users_state_check
    check (state = btrim(state) and char_length(state) between 1 and 100),
  add constraint users_country_code_check
    check (country_code ~ '^[A-Z]{2}$'),
  add constraint users_school_pass_year_check
    check (school_pass_year between 1900 and 2100),
  add constraint users_school_name_check
    check (school_name = btrim(school_name) and char_length(school_name) between 1 and 150),
  add constraint users_college_pass_year_check
    check (college_pass_year ~ '^(19|20)[0-9]{2}$' or college_pass_year = 'NA'),
  add constraint users_college_name_check
    check (college_name = btrim(college_name) and char_length(college_name) between 1 and 150),
  add constraint users_highest_degree_check
    check (highest_degree = btrim(highest_degree) and char_length(highest_degree) between 1 and 100),
  add constraint users_profession_check
    check (profession = btrim(profession) and char_length(profession) between 1 and 100),
  add constraint users_linkedin_url_check
    check (linkedin_url ~ '^https://([a-z0-9-]+\.)*linkedin\.com(/|$)' and char_length(linkedin_url) <= 300),
  add constraint users_journey_stage_other_check
    check (journey_stage_other = btrim(journey_stage_other) and char_length(journey_stage_other) between 1 and 200),
  add constraint users_connection_other_check
    check (connection_other = btrim(connection_other) and char_length(connection_other) between 1 and 200),
  add constraint users_join_reason_other_check
    check (join_reason_other = btrim(join_reason_other) and char_length(join_reason_other) between 1 and 200),
  -- Only ambassadors offer hours.
  add constraint users_weekly_hours_ambassador_check
    check (weekly_hours_id is null or role = 'ambassador');

-- Multi-select answers. References to users never cascade.
create table public.user_jodhpur_connections (
  user_id       uuid not null references public.users (user_id) on delete restrict,
  connection_id smallint not null
    references public.jodhpur_connections (connection_id) on delete restrict,
  primary key (user_id, connection_id)
);

create table public.user_join_reasons (
  user_id        uuid not null references public.users (user_id) on delete restrict,
  join_reason_id smallint not null references public.join_reasons (join_reason_id) on delete restrict,
  primary key (user_id, join_reason_id)
);

-- 23. Members by Jodhpur connection (e.g. everyone who grew up here), and the ON DELETE
--     RESTRICT check when an option is removed. One user's answers use the primary key.
create index user_jodhpur_connections_option_idx
  on public.user_jodhpur_connections (connection_id, user_id);

-- 24. Members by reason for joining, and the ON DELETE RESTRICT check when an option is removed.
create index user_join_reasons_option_idx
  on public.user_join_reasons (join_reason_id, user_id);

-- ----------------------------------------------------------------- lockdown
alter table public.jodhpur_connections      enable row level security;
alter table public.journey_stages           enable row level security;
alter table public.join_reasons             enable row level security;
alter table public.weekly_hours_options     enable row level security;
alter table public.user_jodhpur_connections enable row level security;
alter table public.user_join_reasons        enable row level security;
revoke all on public.jodhpur_connections, public.journey_stages, public.join_reasons,
  public.weekly_hours_options, public.user_jodhpur_connections, public.user_join_reasons
  from anon, authenticated;

-- ---------------------------------------------------- ambassador categories
-- Replaces 0002's version: at most 3 categories (was 2). Same locking as before.
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
    raise exception 'only ambassadors can have categories'
      using errcode = 'check_violation', constraint = 'user_categories_ambassador_only';
  end if;

  select count(*) into area_count
  from public.user_categories
  where user_id = new.user_id;

  if area_count > 3 then
    raise exception 'an ambassador can have at most 3 categories'
      using errcode = 'check_violation', constraint = 'user_categories_max_three';
  end if;

  return null;
end;
$$;
