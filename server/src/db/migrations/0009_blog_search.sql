-- 0009_blog_search.sql
-- Full-text search over the Feed (GET /api/blogs?q=). Reverted by down/0009_blog_search.down.sql.
--
-- Configuration 'simple', not 'english'. Posts mix English with Hindi and Marwari, often
-- transliterated ("kaam", "paisa", "sahi"). 'english' stems and drops stop words by English
-- rules: it mangles those words, and a stem can stop being a prefix of what the reader
-- typed, which breaks search-as-you-type. 'simple' only lowercases and keeps every word as
-- written; prefix matching on the last word ("invest" finds "investing", "investors")
-- covers most inflections.
--
-- Title words weigh more than body words (A over B), so ts_rank puts title matches first.
alter table public.blogs
  add column search_vector tsvector generated always as (
    setweight(to_tsvector('simple', title), 'A') || setweight(to_tsvector('simple', body), 'B')
  ) stored;

-- 14. Feed search: live discussion blogs matching the query
--       where type = 'discussion' and deleted_at is null
--         and search_vector @@ to_tsquery('simple', …)
--     Query Blogs and removed blogs are never searched, so the index leaves them out.
--     The category filter uses the existing blogs_categories primary key and
--     blogs_categories_cat_idx (9).
create index blogs_search_idx
  on public.blogs using gin (search_vector)
  where type = 'discussion' and deleted_at is null;
