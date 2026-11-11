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

| Command                           | What it does                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`                     | Client and server dev servers together                                              |
| `npm run check`                   | Typecheck, lint and format-check everything, then build                             |
| `npm run build`                   | Production build of the client into `client/dist/`, plus a type check of the server |
| `npm run typecheck`               | TypeScript check of both workspaces                                                 |
| `npm run lint` / `npm run format` | ESLint / Prettier across the repo                                                   |
| `npm test`                        | Server unit tests (permission policies, referral codes). No database needed         |
| `npm run test:db:up -w server`    | Start the disposable Postgres for integration tests (Docker)                        |
| `npm run test:integration`        | Server integration tests (signup, auth, constraints, RLS) against that Postgres     |
| `npm run test:db:down -w server`  | Stop and discard the test Postgres                                                  |
| `npm run db:migrate -w server`    | Apply pending SQL migrations to `DATABASE_URL`                                      |
| `npm run db:seed -w server`       | Insert the five categories and their colours (safe to repeat)                       |
| `npm run preview -w client`       | Serve the built client locally (proxies `/api`)                                     |
| `npm run start -w server`         | Run the API in production mode                                                      |
| `npm run images -w client`        | Regenerate responsive images from `client/src/assets/source/`                       |

Add a dependency to one side with `npm install <pkg> -w client` (or `-w server`).
Ask first (see [`CLAUDE.md`](CLAUDE.md)).

## How client and server talk

The client always calls same-origin `/api/...`. In development, Vite proxies `/api` to the
server (`client/vite.config.ts`). In production, put both behind one origin using a
reverse proxy or host rewrites, so no CORS setup is needed (`CORS_ORIGINS` exists for the
case where the API must live on another origin).

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
- `client/src/features/auth/`: sign-in, sign-up and account status. `AuthProvider` (session +
  profile), `RequireAuth` (protected routes), and the forms. `client/src/lib/api.ts` is the
  shared JSON client for `/api`.
- `server/src/app.ts`: middleware stack and route table. `server/src/features/<feature>/`:
  routes, handlers, services, repositories. `server/src/policies/permissions.ts`: who may
  do what. `server/src/db/migrations/`: the schema. `server/src/db/manual/`: SQL to run by
  hand in Supabase (first admin, approvals). Conventions are in [`CLAUDE.md`](CLAUDE.md).

## API

Everything is under `/api`. Reads are public; writes need an approved account (Bearer token).

| Method and path                            | Who                                                                           |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| `GET /health`, `GET /categories`           | anyone                                                                        |
| `POST /auth/referral-codes/validate`       | anyone (rate-limited)                                                         |
| `POST /auth/signup`                        | anyone with a valid referral code                                             |
| `GET /me`                                  | signed in (any status)                                                        |
| `GET /me/referrals`                        | approved                                                                      |
| `GET /me/blogs`, `GET /me/comments`        | signed in: your own blogs and comments, newest first                          |
| `GET /users/:id`                           | anyone (approved users only, public fields)                                   |
| `GET /blogs?cursor&limit`                  | anyone: the Feed, newest first                                                |
| `GET /blogs/:id`                           | anyone                                                                        |
| `POST /blogs`                              | approved                                                                      |
| `DELETE /blogs/:id`                        | ambassador for any of its categories, admin                                   |
| `GET /query-blogs`, `GET /query-blogs/:id` | anyone                                                                        |
| `POST /query-blogs`                        | admin only; one per category                                                  |
| `GET /blogs/:id/comments`                  | anyone (works for Query Blogs too)                                            |
| `POST /blogs/:id/comments`                 | approved; replies under a query: its asker, ambassadors for the topic, admins |
| `DELETE /blogs/:id/comments/:commentId`    | ambassador for the blog's categories, admin                                   |

Errors always look like `{ "error": { "code", "message", "requestId", "fields"? } }`.
Deletes are soft (`deleted_at`): removed comments stay in the thread as placeholders.
`POST /blogs` takes `content`, the editor's formatted document; the server sanitizes it
against an allow-list (`server/src/lib/richText.ts`) and stores its plain text as `body`.

## Configuration

- `client/.env`: **public** build settings only (`VITE_SITE_URL`). It is committed, and
  everything in it ends up in the browser bundle.
- `client/.env.local`: your Supabase URL and publishable key. Git-ignored. See
  `client/.env.example`.
- `server/.env`: server settings and secrets. Git-ignored. Copy `server/.env.example` to
  start. Validated at boot: the server refuses to start with a missing or wrong value.

## Deployment notes

- Set `NODE_ENV=production`, `TRUST_PROXY` (number of proxies in front of the API) and
  `DATABASE_SSL_CA_PATH` on the server. See `docs/SUPABASE_SETUP.md`, "Going to production".
- Rate limits are counted in process memory. Before running more than one API instance,
  give `server/src/middleware/rateLimits.ts` a shared store (e.g. Redis).
- The client is a single-page app: the host must rewrite unknown paths to `/index.html`.
- The static `index.html` carries the Home page's meta tags, so link previews for other
  pages show Home's details until prerendering is added. Head management is centralized in
  `client/src/app/head.ts` to make that switch easy.
