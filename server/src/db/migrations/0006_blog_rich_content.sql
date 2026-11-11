-- 0006_blog_rich_content.sql
-- Formatted blog bodies. `content` holds the allow-listed rich-text document
-- (server/src/lib/richText.ts) that the editor produced; `body` stays as its
-- plain text, which excerpts, read time and the length rules use.
-- Null for Query Blogs (their description is plain text) and for blogs written
-- before formatting existed, which render `body` as paragraphs.

alter table public.blogs
  add column content jsonb,
  add constraint blogs_content_check
    check (
      content is null
      or (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 200000)
    );
