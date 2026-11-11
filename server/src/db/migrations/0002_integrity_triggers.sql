-- 0002_integrity_triggers.sql
-- Rules that span rows or tables, so plain constraints cannot express them.
--
-- Every function pins search_path to '' and schema-qualifies its names, so a caller's
-- search_path can never redirect it to another object.
--
-- Concurrency: the count/existence checks below first lock the row that "owns" the
-- rule (the user, or the category) with FOR NO KEY UPDATE. Under READ COMMITTED (the
-- Postgres default, and what the API uses) that serialises competing writers, and the
-- check that runs after the lock sees the other transaction's committed rows.
-- FOR NO KEY UPDATE does not conflict with the KEY SHARE locks taken by foreign-key
-- checks, so ordinary inserts that reference the row are not blocked.

-- ------------------------------------------------------------------ updated_at
create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create trigger blogs_set_updated_at
  before update on public.blogs
  for each row execute function public.set_updated_at();

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------ ambassador areas
-- Only ambassadors have areas, and at most 2.
create function public.enforce_user_category_rules() returns trigger
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

-- AFTER, so the count includes every row the statement wrote.
create trigger user_categories_rules
  after insert or update on public.user_categories
  for each row execute function public.enforce_user_category_rules();

-- The other side of "only ambassadors have areas": a role change away from
-- ambassador is refused while the user still has areas.
create function public.enforce_areas_on_role_change() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role <> 'ambassador'
     and exists (select 1 from public.user_categories where user_id = new.user_id) then
    raise exception 'only ambassadors can have areas; remove the areas before changing the role'
      using errcode = 'check_violation', constraint = 'user_categories_ambassador_only';
  end if;
  return null;
end;
$$;

create trigger users_role_keeps_areas_valid
  after update of role on public.users
  for each row
  when (new.role is distinct from old.role)
  execute function public.enforce_areas_on_role_change();

-- ----------------------------------------------------------- blog categories
-- A discussion blog has at least one category.
-- A query blog has exactly one category, and each category has at most one
-- non-deleted query blog.
--
-- Checked at COMMIT (deferred constraint triggers), because a blog and its category
-- links are written by separate statements in the same transaction.
create function public.assert_blog_category_rules(target_blog_id uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
  target record;
  category_count integer;
  query_category uuid;
begin
  select type, deleted_at into target
  from public.blogs
  where blog_id = target_blog_id;

  if not found then
    return; -- the blog was deleted in this transaction, and its links went with it
  end if;

  select count(*) into category_count
  from public.blogs_categories
  where blog_id = target_blog_id;

  if target.type = 'discussion' then
    if category_count < 1 then
      raise exception 'a discussion blog needs at least one category'
        using errcode = 'check_violation', constraint = 'blogs_discussion_has_category';
    end if;
    return;
  end if;

  if category_count <> 1 then
    raise exception 'a query blog has exactly one category'
      using errcode = 'check_violation', constraint = 'blogs_query_one_category';
  end if;

  if target.deleted_at is not null then
    return; -- deleted query blogs do not count towards the one-per-category rule
  end if;

  select cat_id into query_category
  from public.blogs_categories
  where blog_id = target_blog_id;

  perform 1 from public.categories where cat_id = query_category for no key update;

  if exists (
    select 1
    from public.blogs_categories bc
    join public.blogs b on b.blog_id = bc.blog_id
    where bc.cat_id = query_category
      and b.blog_id <> target_blog_id
      and b.type = 'query'
      and b.deleted_at is null
  ) then
    raise exception 'this category already has a query blog'
      using errcode = 'unique_violation', constraint = 'blogs_one_query_blog_per_category';
  end if;
end;
$$;

create function public.check_blog_category_rules_for_blog() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.assert_blog_category_rules(new.blog_id);
  return null;
end;
$$;

create function public.check_blog_category_rules_for_link() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op <> 'INSERT' then
    perform public.assert_blog_category_rules(old.blog_id);
  end if;
  if tg_op <> 'DELETE' then
    perform public.assert_blog_category_rules(new.blog_id);
  end if;
  return null;
end;
$$;

-- type and deleted_at are the blog columns the rules depend on (undeleting a query
-- blog must not create a second live one for its category).
create constraint trigger blogs_category_rules
  after insert or update of type, deleted_at on public.blogs
  deferrable initially deferred
  for each row execute function public.check_blog_category_rules_for_blog();

create constraint trigger blogs_categories_rules
  after insert or update or delete on public.blogs_categories
  deferrable initially deferred
  for each row execute function public.check_blog_category_rules_for_link();
