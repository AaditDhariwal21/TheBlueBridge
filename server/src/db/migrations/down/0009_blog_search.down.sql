-- Reverts 0009_blog_search.sql. Run by hand (Supabase SQL Editor) only after the code that
-- needs it is rolled back, and after the down scripts of any later migrations.

begin;

drop index public.blogs_search_idx;
alter table public.blogs drop column search_vector;
delete from public.schema_migrations where name = '0009_blog_search.sql';

commit;
