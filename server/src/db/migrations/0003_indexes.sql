-- 0003_indexes.sql
-- Secondary indexes. This is the complete list beyond primary keys and unique
-- constraints; do not add others without a query that needs them.
-- Keyset pagination orders by (created_at, id) so ties on created_at stay stable.

-- 1. The Feed: newest live discussion blogs, keyset-paginated.
--    where type = 'discussion' and deleted_at is null
--    order by created_at desc, blog_id desc
create index blogs_feed_idx
  on public.blogs (created_at desc, blog_id desc)
  where type = 'discussion' and deleted_at is null;

-- 2. The Query Blogs panel: live query blogs, newest first.
create index blogs_query_panel_idx
  on public.blogs (created_at desc, blog_id desc)
  where type = 'query' and deleted_at is null;

-- 3. "My blogs": one author's live blogs, newest first.
create index blogs_author_idx
  on public.blogs (user_id, created_at desc, blog_id desc)
  where deleted_at is null;

-- 4. A blog's whole comment thread in posting order, and comment counts per blog.
--    Also serves the ON DELETE CASCADE from blogs.
create index comments_thread_idx
  on public.comments (blog_id, created_at, comment_id);

-- 5. Queries under a query blog: its top-level comments, newest first.
create index comments_top_level_idx
  on public.comments (blog_id, created_at desc, comment_id desc)
  where parent_comment_id is null;

-- 6. Replies (answers) under one query or comment, in posting order.
--    Also serves the ON DELETE CASCADE from a parent comment.
create index comments_replies_idx
  on public.comments (parent_comment_id, created_at, comment_id)
  where parent_comment_id is not null;

-- 7. "Where I commented or asked": one author's live comments, newest first.
create index comments_author_idx
  on public.comments (user_id, created_at desc, comment_id desc)
  where deleted_at is null;

-- 8. unique (comment_id, blog_id) is the constraint comments_comment_id_blog_id_key,
--    created with the table in 0001 because the same-blog foreign key needs it.

-- 9. Blogs in a category (filtering by tag), the one-query-blog-per-category check,
--    and the ON DELETE RESTRICT check when a category is deleted.
create index blogs_categories_cat_idx
  on public.blogs_categories (cat_id, blog_id);

-- 10. The approval queue: pending users, oldest first.
create index users_pending_queue_idx
  on public.users (created_at, user_id)
  where status = 'pending';

-- 11. The referral view: who signed up with a given code (GET /me/referrals), and
--     everyone who was referred (the admin's view).
create index users_referral_code_idx
  on public.users (referral_code_id)
  where referral_code_id is not null;
