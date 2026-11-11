-- 0001_core_schema.sql
-- Types, tables and every rule that can be declared as a column or table constraint.
-- Triggers are in 0002, secondary indexes in 0003, and the access lockdown in 0004.
--
-- Conventions
--   * UUID primary keys (gen_random_uuid), timestamptz everywhere (stored as UTC).
--   * Nothing that references users cascades: a user is never removed as a side effect.
--   * Deleting a blog removes its comments and category links (ON DELETE CASCADE).
--   * A category cannot be deleted while a blog or an ambassador uses it (ON DELETE RESTRICT).
--   * Email is not stored here. It lives only in Supabase Auth (auth.users).

create type public.user_role as enum ('member', 'ambassador', 'admin');
create type public.user_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.blog_type as enum ('discussion', 'query');

-- ------------------------------------------------------------------ categories
create table public.categories (
  cat_id   uuid primary key default gen_random_uuid(),
  cat_name text not null,
  constraint categories_cat_name_key unique (cat_name),
  constraint categories_cat_name_check
    check (cat_name = btrim(cat_name) and char_length(cat_name) between 1 and 60)
);

-- ----------------------------------------------------------------------- users
-- The profile row. user_id is the Supabase Auth user id.
-- referral_code_id is the code this user signed up WITH (the referrer's code), so it is
-- null only for the root admin. Its foreign key is added below, after referral_codes
-- exists, because the two tables reference each other.
create table public.users (
  user_id          uuid primary key references auth.users (id) on delete restrict,
  name             text not null,
  phone_number     text not null,
  occupation       text not null,
  role             public.user_role not null,
  status           public.user_status not null default 'pending',
  avatar_url       text,
  referral_code_id uuid,
  reviewed_by      uuid references public.users (user_id) on delete restrict,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint users_name_check
    check (name = btrim(name) and char_length(name) between 1 and 100),
  -- E.164: a plus sign, then 8 to 15 digits. Not unique: phone is profile data only.
  constraint users_phone_number_check
    check (phone_number ~ '^\+[1-9][0-9]{7,14}$'),
  constraint users_occupation_check
    check (occupation = btrim(occupation) and char_length(occupation) between 1 and 100),
  constraint users_avatar_url_check
    check (avatar_url ~ '^https://' and char_length(avatar_url) <= 2048),
  constraint users_reviewed_pair_check
    check ((reviewed_by is null) = (reviewed_at is null)),
  constraint users_timestamps_check
    check (updated_at >= created_at)
);

-- -------------------------------------------------------------- referral_codes
-- One code per profile, reusable without limit. There is no "active" flag: a code is
-- valid exactly while its owner's status is 'approved', so validity can never drift.
create table public.referral_codes (
  referral_code_id uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users (user_id) on delete restrict,
  code             text not null,
  created_at       timestamptz not null default now(),
  constraint referral_codes_user_id_key unique (user_id),
  constraint referral_codes_code_key unique (code),
  -- 10 characters from an alphabet without look-alikes (no 0/O, 1/I/L).
  constraint referral_codes_code_check
    check (code ~ '^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{10}$')
);

-- The circular reference. No insert ever needs it deferred:
--   signup:     insert user (referral_code_id = the referrer's existing code),
--               then insert the user's own code (user_id = the new user).
--   root admin: insert user with referral_code_id null, then insert the root code.
alter table public.users
  add constraint users_referral_code_id_fkey
  foreign key (referral_code_id) references public.referral_codes (referral_code_id)
  on delete restrict;

-- ----------------------------------------------------------------------- blogs
create table public.blogs (
  blog_id    uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (user_id) on delete restrict,
  type       public.blog_type not null,
  title      text not null,
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.users (user_id) on delete restrict,
  constraint blogs_title_check
    check (title = btrim(title) and char_length(title) between 1 and 200),
  constraint blogs_body_check
    check (char_length(body) between 1 and 20000),
  constraint blogs_timestamps_check
    check (updated_at >= created_at),
  constraint blogs_deleted_pair_check
    check ((deleted_at is null) = (deleted_by is null))
);

-- -------------------------------------------------------------------- comments
-- On a query blog a top-level comment is a "query" and its replies are answers.
-- On a discussion blog top-level comments are ordinary comments.
create table public.comments (
  comment_id        uuid primary key default gen_random_uuid(),
  blog_id           uuid not null references public.blogs (blog_id) on delete cascade,
  user_id           uuid not null references public.users (user_id) on delete restrict,
  parent_comment_id uuid,
  body              text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  deleted_by        uuid references public.users (user_id) on delete restrict,
  -- Index 8 in the index plan: the target of the same-blog foreign key below.
  constraint comments_comment_id_blog_id_key unique (comment_id, blog_id),
  -- A reply's parent must belong to the same blog. MATCH SIMPLE skips the check for
  -- top-level comments (parent_comment_id is null).
  constraint comments_parent_same_blog_fkey
    foreign key (parent_comment_id, blog_id)
    references public.comments (comment_id, blog_id)
    on delete cascade,
  constraint comments_not_own_parent_check
    check (parent_comment_id <> comment_id),
  constraint comments_body_check
    check (char_length(body) between 1 and 5000),
  constraint comments_timestamps_check
    check (updated_at >= created_at),
  constraint comments_deleted_pair_check
    check ((deleted_at is null) = (deleted_by is null))
);

-- ------------------------------------------------------------ blogs_categories
create table public.blogs_categories (
  blog_id uuid not null references public.blogs (blog_id) on delete cascade,
  cat_id  uuid not null references public.categories (cat_id) on delete restrict,
  primary key (blog_id, cat_id)
);

-- ------------------------------------------------------------- user_categories
-- An ambassador's areas (1 or 2). Limits are enforced by triggers in 0002.
create table public.user_categories (
  user_id uuid not null references public.users (user_id) on delete restrict,
  cat_id  uuid not null references public.categories (cat_id) on delete restrict,
  primary key (user_id, cat_id)
);
