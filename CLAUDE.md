# The Blue Bridge: working agreement

Invite-only community site for professional women from Jodhpur. npm-workspaces monorepo:
`client/` (React 19, Vite 8, React Router 8, Tailwind 4) and `server/` (Express 5, run by
Node's type stripping, no build). Supabase provides Auth and Postgres. Read `README.md`
for commands and `docs/SUPABASE_SETUP.md` for the Supabase project.

Priorities, all equal: correct functionality and flow, security, scalability. Choose the
simplest correct option; no speculative features, no dead code.

## Always

- Run `npm run check` (typecheck, lint, format check, build) and `npm test` before
  finishing. If you touched SQL, `server/src/features/**/*.repository.ts`, auth or
  middleware, also run `npm run test:db:up -w server` then `npm run test:integration`.
- Strict TypeScript everywhere (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
  No `any`, no non-null assertions to silence errors.
- Ask before adding a dependency.
- Never put secrets in code, tests, docs or chat. Secrets live in `server/.env` (ignored)
  or the host's secret manager. `client/.env*` is public by definition.

## Frontend conventions (client/)

- Colours, fonts and sizes come only from `src/styles/tokens.css` (documented in
  `docs/design-tokens.md`). ESLint rejects arbitrary hex/px Tailwind values.
- Square corners, no drop shadows, Playfair for display, Inter for text.
- Routes live in `src/app/routes.ts` with per-page meta; secondary pages are lazy. Pages in
  `src/pages/` stay thin and compose `components/` and `features/`.
- Feature code lives in `src/features/<name>/`. Shared primitives live in `src/components/ui/`
  (`Button`/`buttonClasses`, `Field`, `Input`, `Card`, `StateMessage`, `Skeleton`, …).
  Record every component in `docs/components.md`.
- Use `buttonClasses()` on router `<Link>`s for link-buttons; internal links are never `<a href>`.
- Accessibility: labels via `Field`, errors linked with `aria-describedby`, focus moved to
  the first invalid field on submit, `role="alert"` for errors, `aria-busy` while loading.
  Every data view has loading, empty and error states.
- API calls go through `src/lib/api.ts` (typed `ApiError`; `retryTransient` for calls that
  must survive a restarting API). Dev: same-origin `/api` via the Vite proxy. Prod: `VITE_API_URL`
  (Render) with CORS; see `docs/DEPLOYMENT.md`.
- Auth: `useAuth()` from `features/auth/authContext.ts`; mark a route `requiresAuth: true`
  to wrap it in `RequireAuth`. Show or hide controls with `features/auth/permissions.ts`, the
  client mirror of the server's policies (keep them in step). The API is what enforces them.
- Categories are called "categories" everywhere (never "areas"). Each has a `color` from the
  API, rendered only as `CategoryDot` beside its name. Colours map to tokens in
  `lib/categoryColor.ts`; never hard-code a category's colour.
- Heavy, rarely used code (the editor, supabase-js) is loaded on demand with dynamic
  `import()`, so the first page stays small. Check the build output's `index-*.js` size.
- 21st.dev components only when clearly better than building with the existing primitives;
  log any import in `docs/components.md`.

## Backend conventions (server/)

### Layout and layering

```
src/
  index.ts            boot: config → logger → pool → app → listen; graceful shutdown
  app.ts              middleware stack + route table (everything under /api)
  config/env.ts       Zod schema for every env var; fail fast at boot, names only in errors
  db/                 schema.ts (Kysely types), client.ts, migrator.ts, seed.ts,
                      migrations/NNNN_name.sql, manual/*.sql (run by hand in Supabase)
  features/<feature>/ <feature>.routes.ts → .handlers.ts → .service.ts → .repository.ts
                      (+ .schemas.ts for Zod input schemas)
  middleware/         requestContext (pino-http, request id), authenticate, rateLimits,
                      errorHandler
  policies/           permissions.ts: pure, unit-tested authorization rules
  lib/                errors, logger, validation, referralCode, identity (Supabase Auth
                      admin), accessToken (JWT verification)
test/                 integration tests + support/ (test DB, fixtures, fakes, tokens)
```

- **routes** wire paths to middleware and handlers. **handlers** parse input with Zod
  (`parseInput`), call one service, and shape the HTTP response. They never touch the
  database. **services** hold the logic and transactions and call repositories (their own
  feature's) or other features' services, never another feature's repository.
  **repositories** are the only place that builds SQL, and they return rows, not DTOs.
- Dependencies are passed in explicitly (`createApp(deps)`, `fooRoutes(deps)`, service
  functions take `db` first). No module-level singletons besides the boot file, so tests
  can swap the identity provider, token verifier and database.
- Services and repositories are plain exported functions. No classes except `AppError`.
- Node runs `.ts` directly: imports use the `.ts` extension, and only erasable TS syntax is
  allowed (no enums, namespaces or parameter properties).
- Express 5 forwards rejected promises to the error handler, so async handlers just throw.

### API rules

- Every path is under `/api`. JSON only, body limit 16 KB, `Cache-Control: no-store`.
- Validate every input (body, params, query) with a Zod `strictObject`. Normalize there
  (trim, collapse whitespace, lowercase email, strip phone punctuation).
- Errors: throw `AppError(code, message, fields?)`. The one error handler returns
  `{ error: { code, message, requestId, fields? } }`. Anything else becomes a generic 500.
  Never leak stack traces, SQL or internal messages.
- Responses are wrapped: `{ user }`, `{ categories }`, `{ referrals, counts, nextCursor }`.
- Lists that can grow use keyset pagination on `(created_at, id)` with an opaque cursor
  (`lib/cursor.ts`: `cursorParam`, `keysetBefore`, `paginate`), backed by a matching index.
- Reads of community content are public; writes go through `requireAuth`, `requireApproved`,
  then a policy check in the service (`getScopedActor` loads an ambassador's categories).
  Posting is limited per member (`writeRateLimit`).
- Deletes are soft (`deleted_at`, `deleted_by`). Removed comments are returned with
  `removed: true` and `body: null` so replies keep their place.
- User text is normalized with `lib/text.ts` via `singleLineText` / `multilineText`
  (`lib/validation.ts`) and stored as plain text; the client renders it as text, never HTML.
- Formatted blog bodies are an allow-listed document (`lib/richText.ts`): add a node or mark
  there, in the client mirror (`client/src/features/blogs/model/richText.ts`), the renderer
  (`RichText.tsx`) and the editor together. Never render stored content with
  `dangerouslySetInnerHTML`.
- Anything that reveals whether a secret-ish value is valid (referral codes, emails) gives
  one generic answer and sits behind `referralAttemptRateLimit` or a similar limiter.

### Auth and permissions

- Supabase Auth owns identity. Only the server, holding the secret key, creates Auth users
  (`lib/identity.ts`). Public self-signup is disabled in the dashboard.
- `requireAuth` verifies the Bearer JWT locally against the project's JWKS (`lib/accessToken.ts`:
  issuer, audience `authenticated`, ES256/RS256), then loads `id, role, status` from
  `public.users` on every request. `viewerOf(req)` reads it. `requireApproved` gates routes
  that need an approved account.
- Every authorization question goes through `src/policies/permissions.ts`. Only `approved`
  accounts have role powers; ambassadors are scoped to their own categories; admins are not,
  and only admins start Query Blogs. Add a
  new rule there, with unit tests, before using it in a route.

### Database

- Express connects to Postgres directly (Kysely + pg), never through the Supabase Data API.
  Multi-step writes run in `db.transaction().execute(...)`.
- Schema changes are new raw SQL files in `src/db/migrations/` (`NNNN_snake_case.sql`),
  applied in order, each in a transaction. Never edit an applied migration. Update
  `src/db/schema.ts` to match. The server refuses to start while any migration is pending,
  so apply migrations before (or as part of) deploying the code that needs them.
- Every new table: `enable row level security` with no policies, and no grants to `anon`
  or `authenticated`. `test/integration/lockdown.test.ts` enforces this.
- Encode every rule the database can enforce: named constraints (`<table>_<rule>_check`,
  `_key`, `_fkey`), and triggers for cross-row rules. Trigger functions use
  `set search_path = ''` and schema-qualified names. Lock the owning row
  (`for no key update`) before count or existence checks. Raise errors with a SQLSTATE
  and a `constraint` name so tests and services can match on them.
- References to `users` never cascade. Deleting a blog cascades to its comments and links.
  Categories are restricted while in use.
- Indexes: only those with a named query in a comment. The list is in `0003_indexes.sql`.
- Email lives only in Supabase Auth (`auth.users`); never copy it into `public`.
- Derived facts (code validity, referral counts) are computed by queries, never stored.

### Logging and security

- pino JSON logs via `req.log`. Log ids and codes, never bodies, headers, tokens, emails,
  names or phone numbers. Errors go through the safe serializer in `lib/logger.ts`.
- helmet, CORS allowlist from `CORS_ORIGINS` (no credentials), `trust proxy` from
  `TRUST_PROXY`, client IP for rate limits from `CLIENT_IP_HEADER` when set (Cloudflare), rate limits in `middleware/rateLimits.ts` (in-memory; needs a shared store
  before running more than one instance).

### Tests

- `node:test` + `node:assert/strict`, run by Node directly. Unit tests sit next to the code
  (`*.test.ts` in `src/`) and need no database.
- Integration tests live in `test/integration/`. Each file creates its own throwaway database
  (Supabase shim, all migrations, seed) inside the Docker Postgres from `test/compose.yaml`,
  and skips with an explanation when `TEST_DATABASE_URL` is unset. Use `test/support/` fakes
  (`createFakeIdentity`, `createTokenKit`) instead of network calls.
- For concurrency claims, prove that the lock is actually taken (see the category-limit race
  test). A test that passes without the lock proves nothing.
