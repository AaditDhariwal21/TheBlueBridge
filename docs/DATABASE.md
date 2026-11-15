# Database: migrations, data model, indexes

The schema lives in `server/src/db/migrations/` as numbered SQL files, applied in order by
`npm run db:migrate -w server` (each in its own transaction, recorded in
`public.schema_migrations`). The server refuses to start while any migration is pending.
Applied files are never edited; changes are new files. `server/src/db/schema.ts` mirrors
the result for Kysely.

## Migrations, in order

| File                          | What it does                                                         |
| ----------------------------- | -------------------------------------------------------------------- |
| `0001_core_schema.sql`        | Types, tables and declarative constraints                            |
| `0002_integrity_triggers.sql` | Cross-row rules (ambassador categories, one Query Blog per category) |
| `0003_indexes.sql`            | Secondary indexes 1–11                                               |
| `0004_lockdown.sql`           | RLS on, no grants for `anon`/`authenticated`                         |
| `0005_category_colors.sql`    | `categories.color`                                                   |
| `0006_blog_rich_content.sql`  | `blogs.content` (formatted bodies)                                   |
| `0007_admin_action_logs.sql`  | The append-only admin action log, indexes 15–17                      |
| `0008_member_directory.sql`   | `users.role_rank` and indexes 12–13 (directory, admin member list)   |
| `0009_blog_search.sql`        | `blogs.search_vector` and index 14 (Feed full-text search)           |
| `0010_admin_member_order.sql` | Index 18 (admin Community Directory order); drops index 13           |
| `0011_soft_delete_purge.sql`  | Live-only comment indexes, indexes 19–21, the 30-day purge + pg_cron |
| `0012_application_review.sql` | `users.review_note`, rejection actions in the log, index 22          |
| `0013_profile_details.sql`    | Application option sets, answers on `users`, indexes 23–24, max 3    |

To deploy 0007–0010: run `npm run db:migrate:prod -w server` (it applies 0007, 0008, 0009,
0010 in that order), then deploy the server and the client. Each is additive: existing columns,
tables and endpoints are unchanged. 0008 and 0009 add stored generated columns, which
rewrite `users` and `blogs` once (a brief lock; fine at this size).

To deploy 0011–0013: run `npm run db:migrate:prod -w server`, then deploy the server and the
client. All three are additive for existing data (new columns are nullable, new tables start
empty apart from the seeded option sets). 0011 also turns on `pg_cron` and schedules the purge
when it runs in Supabase's `postgres` database (see "Soft delete and the 30-day purge").

### Rolling back

Every migration from 0007 on has a down script in `server/src/db/migrations/down/`. Roll the
code back first, then run the down scripts by hand in the Supabase SQL Editor, newest first:
`0013_profile_details.down.sql` … `0007_admin_action_logs.down.sql`. Each drops what its
migration added and removes its row from `schema_migrations`, so `db:migrate` can apply it
again. 0007's down script deletes the whole admin action log; 0013's deletes the application
answers; 0012's keeps logged rejections (the log is append-only) by restoring the old checks as
`NOT VALID`; 0011's unschedules the purge and refuses to run while scrubbed comment
placeholders exist. `test/integration/migrations.test.ts` reverts them all on a database with
data and re-applies them.

## Data model changes

### `admin_action_logs` (0007)

| Column         | Type          | Notes                                                                                                                                                    |
| -------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `log_id`       | `uuid` PK     |                                                                                                                                                          |
| `admin_id`     | `uuid`        | FK → `users` (`on delete restrict`)                                                                                                                      |
| `action`       | `text`        | `member_approved`, `ambassador_approved`, `member_rejected`, `ambassador_rejected` (0012), `query_blog_created`, `query_blog_deleted` (check constraint) |
| `target_type`  | `text`        | `user` or `blog`, fixed by the action (check constraint)                                                                                                 |
| `target_id`    | `uuid`        | **No foreign key**, on purpose (see below)                                                                                                               |
| `target_label` | `text`        | The target's name or title at the time, 1–200 characters                                                                                                 |
| `reason`       | `text` null   | Optional, trimmed, 1–500 characters. For approvals and rejections, the review note                                                                       |
| `created_at`   | `timestamptz` |                                                                                                                                                          |

- **Deliberate denormalization.** The target is a plain id plus a snapshot label, so removing
  or renaming a target never blocks it or breaks the log, and an entry stays readable.
- **Append-only, in the database.** `UPDATE`, `DELETE` and `TRUNCATE` are revoked from every
  role, the owner (the API's role) included, and triggers reject them even for superusers
  (SQLSTATE `42501`, constraint `admin_action_logs_append_only`). There are no edit or delete
  endpoints.
- **Atomic with its action.** `logAdminAction` (`server/src/features/adminLog/`) refuses to run
  outside a transaction; approvals and Query Blog creation and removal call it inside their
  own transaction, so the action and its entry commit or roll back together.
- RLS is on with no policies, like every table.

### `users.role_rank` (0008)

`smallint`, generated and stored: `0` admin, `1` ambassador, `2` member. The directory's order
is spelled out here rather than relying on the enum's declaration order.

### `blogs.search_vector` (0009)

`tsvector`, generated and stored: title at weight A, body at weight B, configuration
`simple` (posts mix English with Hindi and Marwari, often transliterated; `english` stemming
would mangle those words and break prefix matching). Search input is turned into a
`to_tsquery` string by `server/src/lib/searchQuery.ts`: only letters, marks and digits survive,
every word must match, and the last is a prefix (`wom` finds `women`).

### Soft delete and the 30-day purge (0011)

Deleting a blog or comment sets `deleted_at` and `deleted_by` (soft delete; there is no
restore). Every read path filters on `deleted_at is null`: the Feed, search, a blog and its
thread, Query Blogs, comment and query counts, "my blogs/comments" and a member's activity. A
deleted blog takes all its comments out of view with it. A deleted comment appears in its
thread only while a live reply hangs beneath it, as a placeholder with no text and no author
(blanked in SQL, `comments.repository.ts` `selectThread`); otherwise it is not returned at all.

`public.purge_soft_deleted(retention => '30 days', batch_size => 500, max_batches => 200)`
removes the data for good once `deleted_at` is older than the retention:

1. hard-deletes blogs (comments and category links go by `ON DELETE CASCADE`);
2. hard-deletes comments with no child rows left, repeating so parents go after children;
3. for comments that still have children, erases `body` and `user_id` (`comments_scrubbed_check`:
   both or neither) and keeps the row as a placeholder until a later run finds it childless.

It works in bounded batches (`for update skip locked`), is idempotent, does nothing if another
run holds its advisory lock, and writes one row per run to `public.purge_runs` (counts of blogs,
their cascaded comments, comments deleted, comments scrubbed, and whether it finished within its
budget). pg_cron runs it daily at **21:30 UTC (03:00 IST)** as job `purge-soft-deleted`.

Check it in the Supabase SQL Editor:

```sql
select * from public.purge_runs order by run_id desc limit 10;           -- what each run removed
select * from cron.job where jobname = 'purge-soft-deleted';              -- the schedule
select status, return_message, start_time from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'purge-soft-deleted')
order by start_time desc limit 10;                                       -- did it run, any error
select * from public.purge_soft_deleted();                                -- run it now, by hand
```

### Application review (0012)

`users.review_note` (nullable, trimmed, 1–500 characters) holds the note of the latest decision,
shown to the applicant as "Message from the Blue Bridge team". Approve takes it optionally,
reject requires it; both write it into the admin log's `reason` in the same transaction, so
history survives. Reapplying (`POST /api/me/reapply`, rejected accounts only) replaces the
answers, role and categories, sets the status back to `pending` and clears `review_note`,
`reviewed_by` and `reviewed_at`; the admin sees earlier decisions from the log.

### Application answers (0013)

| Object                                                                          | Kind                | Notes                                                             |
| ------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------- |
| `jodhpur_connections`, `journey_stages`, `join_reasons`, `weekly_hours_options` | lookup tables       | `code` (stable, used by the API), `label`, `sort_order`, `active` |
| `user_jodhpur_connections`, `user_join_reasons`                                 | junctions           | `(user_id, option_id)` primary key, reverse index on the option   |
| `users.journey_stage_id`, `users.weekly_hours_id`                               | FKs (single choice) | Weekly hours only for ambassadors (check)                         |
| `users.connection_other`, `journey_stage_other`, `join_reason_other`            | text                | The "Other" answer; set only while Other is chosen                |
| `users.maiden_name`, `city`, `state`, `country_code`                            | text                | Country is ISO 3166-1 alpha-2 (`shared/countries.ts`)             |
| `users.school_pass_year` (smallint), `school_name`                              |                     | School name only if the school was in Jodhpur                     |
| `users.college_pass_year` (text), `college_name`                                |                     | A year or `'NA'`; NULL means "not answered yet" (existing users)  |
| `users.highest_degree`, `profession`, `linkedin_url`                            | text                | LinkedIn: https on linkedin.com only (check)                      |

Options change with plain SQL: add a row, edit a `label` or `sort_order`, or retire one with
`active = false` (kept for the people who chose it, no longer offered). The code `other` is
the one that asks for free text. Every new column is nullable because existing members have
none of this yet; the API (`features/users/users.schemas.ts`) is the single gate that makes the
answers mandatory on every new application and reapplication. Once existing members' details
are loaded, the columns can be tightened with `NOT NULL` in a new migration.

An ambassador may now have up to 3 categories (the `user_categories_rules` trigger raises
`user_categories_max_three`).

Email is still stored only in Supabase Auth. Profile endpoints read it with a join on
`auth.users` in the same query, never copying it into `public` and never one lookup per user.

## Indexes added

Numbering continues the list in `0003_indexes.sql`.

| #   | Index                                 | Serves                                                                |
| --- | ------------------------------------- | --------------------------------------------------------------------- |
| 12  | `users_directory_idx`                 | `GET /members`: `(role_rank, lower(name), user_id)` where approved    |
| 13  | `users_admin_list_idx`                | Dropped by 0010 (the admin list no longer sorts by join date)         |
| 14  | `blogs_search_idx`                    | Feed search: GIN on `search_vector`, live discussion blogs only       |
| 15  | `admin_action_logs_recent_idx`        | Activity log, newest first                                            |
| 16  | `admin_action_logs_admin_idx`         | Activity log for one admin (also the `admin_id` FK check)             |
| 17  | `admin_action_logs_action_idx`        | Activity log for one action                                           |
| 18  | `users_admin_directory_idx`           | `GET /admin/members`: `(role_rank, lower(name), user_id)`, any status |
| 4   | `comments_thread_idx` (0011)          | Now live comments only: a thread, comment counts, last activity       |
| 5   | `comments_top_level_idx` (0011)       | Now live top-level comments only: query counts                        |
| 19  | `comments_blog_idx`                   | Every comment of a blog: the cascade when the purge deletes a blog    |
| 20  | `blogs_purge_idx`                     | The purge: deleted blogs by `deleted_at` (partial, deleted only)      |
| 21  | `comments_purge_idx`                  | The purge: deleted comments by `deleted_at` (partial, deleted only)   |
| 22  | `admin_action_logs_target_idx`        | One applicant's decisions, newest first (admin member record)         |
| 23  | `user_jodhpur_connections_option_idx` | Members by connection; the restrict check when an option goes         |
| 24  | `user_join_reasons_option_idx`        | Members by reason; the restrict check when an option goes             |

Already present and reused: `users_referral_code_idx` (11, who used a code: the account
page's and the admin panel's referral lists), `users_pending_queue_idx` (10, the pending
filter, scanned backwards), and the `blogs_categories` primary key plus
`blogs_categories_cat_idx` (9, the category filter).

## Query plans

`test/integration/queryPlans.test.ts` captures the exact SQL of each new list query and
checks it can use its index (it fails if a query's shape stops matching). Measured with
`EXPLAIN ANALYZE` on 20,000 users, 20,000 blogs and 5,000 log entries (Postgres 17):

| Query                                  | Plan                                                                    | Time    |
| -------------------------------------- | ----------------------------------------------------------------------- | ------- |
| Directory, first page                  | Index Scan `users_directory_idx`, no sort                               | 0.04 ms |
| Directory, page from the middle        | Index Scan, `Index Cond: ROW(role_rank, lower(name), user_id) > ROW(…)` | 0.05 ms |
| Admin members (0010), unfiltered       | Index Scan `users_admin_directory_idx` in order, no sort (plan test)    | —       |
| Admin members, pending only            | Index Scan Backward `users_pending_queue_idx`                           | 0.04 ms |
| Feed, two categories                   | Index Scan `blogs_feed_idx` + `blogs_categories_pkey` semi-join         | 0.7 ms  |
| Feed search, no hits ("women lead")    | Bitmap Index Scan `blogs_search_idx`, then rank, top-N                  | 3 ms    |
| Feed search, broad prefix (1,036 hits) | Bitmap Index Scan `blogs_search_idx`, rank all hits, top-N              | 56 ms   |
| Activity log (any filter)              | Index Scan `admin_action_logs_recent_idx`                               | 0.06 ms |

Notes:

- With only four actions and one admin in the sample, the planner rightly walks
  `admin_action_logs_recent_idx` and filters; the per-admin and per-action indexes take over
  when a filter is selective (the plan test proves they are usable).
- Relevance order has to rank every match before taking the top 10, so a very broad search
  (a short prefix matching thousands of posts) costs tens of milliseconds. At this
  community's size that is fine; if the Feed grows to hundreds of thousands of posts, cap the
  number of candidates ranked.
- Every keyset pagination compares the full sort key including the id, so equal timestamps,
  equal names and equal ranks never skip or repeat a row (tested at page boundaries).
