# The Blue Bridge

Website for The Blue Bridge, a community connecting professional women with Jodhpur roots.
An npm-workspaces monorepo:

```
client/   Frontend. React 19, TypeScript (strict), Vite 8, React Router 8, Tailwind CSS 4.
server/   Backend API. Express 5 + TypeScript, run directly by Node (no build step).
          Supabase Auth for identity, Postgres via Kysely, raw SQL migrations.
docs/     Supabase setup guide, design tokens, component inventory, reference captures.
scripts/  Repo-level tooling (the combined dev runner).
```

## Getting started

Requires Node 22.13 or later (Node 24 LTS recommended for production).

```sh
npm install          # once, from the repo root: installs both workspaces
npm run dev          # client + server together
```

The server needs a Supabase project and `server/.env` to start, and sign-in needs
`client/.env.local`. First time? Follow [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md).

- Website: <http://localhost:5180>
- API: <http://127.0.0.1:3001/api/health>, also reachable through the site as `/api/health`

Run each side on its own:

```sh
npm run dev:client   # just the frontend (Vite)
npm run dev:server   # just the API (restarts on file changes)
```

TypeScript needs no extra step: Vite compiles the client and Node strips types from the
server at runtime. `npm run typecheck` is what checks the types.

## All commands (run from the repo root)

| Command                                              | What it does                                                                        |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`                                        | Client and server dev servers together                                              |
| `npm run check`                                      | Typecheck, lint and format-check everything, then build                             |
| `npm run build`                                      | Production build of the client into `client/dist/`, plus a type check of the server |
| `npm run typecheck`                                  | TypeScript check of both workspaces                                                 |
| `npm run lint` / `npm run format`                    | ESLint / Prettier across the repo                                                   |
| `npm test`                                           | Server unit tests (permission policies, referral codes). No database needed         |
| `npm run test:db:up -w server`                       | Start the disposable Postgres for integration tests (Docker)                        |
| `npm run test:integration`                           | Server integration tests (API, constraints, RLS, query plans, migrations)           |
| `npm run test:db:down -w server`                     | Stop and discard the test Postgres                                                  |
| `npm run db:migrate -w server`                       | Apply pending SQL migrations to `DATABASE_URL` (list: `docs/DATABASE.md`)           |
| `npm run db:seed -w server`                          | Insert the five categories and their colours (safe to repeat)                       |
| `npm run db:migrate:prod -w server` / `db:seed:prod` | The same against PROD, using `server/.env.production.local`                         |
| `npm run preview -w client`                          | Serve the built client locally (proxies `/api`)                                     |
| `npm run start -w server`                            | Run the API in production mode                                                      |
| `npm run images -w client`                           | Regenerate responsive images from `client/src/assets/source/`                       |

Add a dependency to one side with `npm install <pkg> -w client` (or `-w server`).
Ask first (see [`CLAUDE.md`](CLAUDE.md)).

## How client and server talk

In development the client calls same-origin `/api/...` and Vite proxies it to the server
(`client/vite.config.ts`). In production the site (Vercel) calls the API (Render) directly:
`VITE_API_URL` points the client at the API, and the API allows the site's origin through
`CORS_ORIGINS`. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

Sign-in happens in the browser with supabase-js. Every API call that needs a user sends
the Supabase access token as `Authorization: Bearer <token>`; the server verifies it
against the project's signing keys and loads the user's role and status from Postgres.

## Where things live

- `client/src/styles/tokens.css`: design tokens, the only place colours, fonts and sizes are
  defined. The written reference is [`docs/design-tokens.md`](docs/design-tokens.md).
- `client/src/app/`: router, route table with per-page meta, head management, site constants.
- `client/src/pages/`: thin pages that compose `client/src/components/sections/`.
- `client/src/lib/submitWaitlist.ts`: **stub.** This is the single place to connect the
  waitlist to the API.
- `client/src/features/blogs/`: the Blogs section (feed, blog pages, Query Blogs, threaded
  comments, moderation). All data goes through the `BlogsApi` contract, implemented over the
  API by `api/httpBlogsApi.ts`. Controls are shown or hidden with
  `features/auth/permissions.ts`; the server enforces the same rules.
- `client/src/features/categories/`: the category list (`useCategories`), shared by sign-up
  and the composers.
- `client/src/features/admin/`: the admin panel (`/adminpanel`): overview, members and
  approvals, Query Blogs, activity log. `client/src/features/members/`: the member directory
  on the Community page. `client/src/features/referrals/`: "People who joined using your
  code" on the account page.
- `client/src/components/ui/Toaster.tsx` + `toast.ts`: toast notifications (`useToast()`).
- `client/src/features/auth/`: sign-in, sign-up and account status. `AuthProvider` (session +
  profile), `RequireAuth` (protected routes), and the forms. `client/src/lib/api.ts` is the
  shared JSON client for `/api`.
- `server/src/app.ts`: middleware stack and route table. `server/src/features/<feature>/`:
  routes, handlers, services, repositories. `server/src/policies/permissions.ts`: who may
  do what. `server/src/db/migrations/`: the schema, with down scripts in `down/`
  ([`docs/DATABASE.md`](docs/DATABASE.md) lists them, the indexes and the data model
  changes). `server/src/db/manual/`: SQL to run by hand in Supabase (first admin, emergency
  approvals). Conventions are in [`CLAUDE.md`](CLAUDE.md).

## API

Everything is under `/api`. Reads are public; writes need an approved account (Bearer token).

| Method and path                            | Who                                                                                                                                                            |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`, `GET /categories`           | anyone                                                                                                                                                         |
| `POST /auth/referral-codes/validate`       | anyone (rate-limited)                                                                                                                                          |
| `POST /auth/signup`                        | anyone with a valid referral code                                                                                                                              |
| `GET /me`                                  | signed in (any status)                                                                                                                                         |
| `GET /me/referrals?cursor&limit`           | approved: the people who joined with **your own** code, with totals                                                                                            |
| `GET /me/blogs`, `GET /me/comments`        | signed in: your own blogs and comments, newest first                                                                                                           |
| `GET /users/:id`                           | anyone (approved users only; name, occupation, role, avatar, categories)                                                                                       |
| `GET /members?q&roles&cursor&limit`        | approved: the directory, admins → ambassadors → members, each by name. `q` = name or occupation (2–100 chars), `roles` = comma list; returns `counts` per role |
| `GET /members/:id`                         | approved: an approved member's full profile, phone and email included                                                                                          |
| `GET /members/:id/blogs`, `/comments`      | approved: a member's blogs and comments for their profile, newest first, paged                                                                                 |
| `GET /members/count`                       | anyone: `{ count }` of approved admins, ambassadors and members                                                                                                |
| `GET /blogs?cursor&limit&q&categories`     | anyone: the Feed. `q` searches (2–100 chars), `categories` = ids, any match                                                                                    |
| `GET /blogs/:id`                           | anyone                                                                                                                                                         |
| `POST /blogs`                              | approved                                                                                                                                                       |
| `DELETE /blogs/:id`                        | discussion blog: ambassador for any of its categories, admin. Query Blog: admin                                                                                |
| `GET /query-blogs`, `GET /query-blogs/:id` | anyone                                                                                                                                                         |
| `POST /query-blogs`                        | admin only; one per category (same as `POST /admin/query-blogs`)                                                                                               |
| `GET /blogs/:id/comments`                  | anyone (works for Query Blogs too)                                                                                                                             |
| `POST /blogs/:id/comments`                 | approved; replies under a query: its asker, ambassadors for the topic, admins                                                                                  |
| `DELETE /blogs/:id/comments/:commentId`    | ambassador for the blog's categories, admin                                                                                                                    |

**Admin panel API** (`/api/admin/*`): every request needs a valid token (401), stays within a
per-admin limit of 60 requests a minute (429), and must come from an approved admin (403).

| Method and path                                 | What it does                                                                                                |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `GET /admin/overview`                           | pending applications: `{ pending: { total, members, ambassadors } }`                                        |
| `GET /admin/members?q&status&role&cursor&limit` | everyone, admins → ambassadors → members, each by name; `q` = name or occupation; returns `counts` per role |
| `GET /admin/members/:id`                        | full profile, status, who invited them, first page of who used their code                                   |
| `GET /admin/members/:id/referrals?cursor`       | the rest of the people who used their code                                                                  |
| `POST /admin/members/:id/approve`               | body `{ reason? }`: approves a pending member/ambassador (409 if not pending)                               |
| `POST /admin/query-blogs`                       | starts a category's Query Blog (409 if the category has one)                                                |
| `DELETE /admin/query-blogs/:id`                 | body `{ reason? }`: removes a Query Blog and, with it, its queries                                          |
| `GET /admin/action-logs?action&adminId&cursor`  | the activity log, newest first (read-only; there is no edit or delete)                                      |

Approvals and Query Blog creation and removal (through either route) are written to the
append-only admin action log in the same transaction as the action itself.
Lists are keyset-paginated: pass `nextCursor` back as `?cursor=`; `limit` has a default and
a maximum (50, or 100 for referrals).

Errors always look like `{ "error": { "code", "message", "requestId", "fields"? } }`, with
400 for invalid input (`VALIDATION_FAILED`, per field), 401, 403, 404, 409 and 429.
Deletes are soft (`deleted_at`): removed comments stay in the thread as placeholders, and a
removed Query Blog takes its queries out of view with it.
`POST /blogs` takes `content`, the editor's formatted document; the server sanitizes it
against an allow-list (`server/src/lib/richText.ts`) and stores its plain text as `body`.

## Configuration

- `client/.env.local`: your site URL, Supabase URL and publishable key (all public). Git-ignored. See
  `client/.env.example`.
- `server/.env`: server settings and secrets. Git-ignored. Copy `server/.env.example` to
  start. Validated at boot: the server refuses to start with a missing or wrong value.

## Deployment notes

Dev and prod are separate Supabase projects: local development always uses dev, the
deployed site always uses prod. Step-by-step guide and every environment variable for
Render and Vercel: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

- `vercel.json` configures the site's build, SPA rewrite, asset caching and security headers.
- The static `index.html` carries the Home page's meta tags, so link previews for other
  pages show Home's details until prerendering is added. Head management is centralized in
  `client/src/app/head.ts` to make that switch easy.
