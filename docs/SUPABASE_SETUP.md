# Supabase setup

A walkthrough for someone who has never used Supabase. It takes about 30 minutes. Do the
steps in order: later steps depend on earlier ones.

Dashboard labels were checked against Supabase's docs in November 2026. Supabase renames
things now and then. If a label differs, look for the closest match; the links below go
straight to each page (replace `_` with your project if a link doesn't redirect).

> **Secrets never go in chat, issues, screenshots or commits.** They go only in
> `server/.env` (git-ignored) or your host's secret settings.

---

## What Supabase does here, and what it doesn't

```
Browser ──supabase-js (publishable key)──▶ Supabase Auth      sign-in, sessions, tokens
   │
   └──── /api/... + Bearer access token ──▶ Express API ──▶ Supabase Postgres
                                            (verifies token,     (all app data,
                                             checks permissions)  RLS locked down)
```

- **Supabase Auth** stores email + password identities and issues access tokens (JWTs).
- **Supabase Postgres** stores all application data (`public.users`, blogs, and so on).
- **Our Express API** is the only thing that reads or writes application data. It connects
  to Postgres directly. Supabase's auto-generated Data API (PostgREST) is not used: every
  table has Row Level Security on with no policies, and no privileges for the public roles.
  So even a leaked key can't read data through it.

**Query layer: Kysely (with `pg`).** It is a typed SQL builder that checks every column
name and type at compile time against `server/src/db/schema.ts`, and it does not try to own
the schema, so it fits raw SQL migrations and gives explicit, real transactions.
Drizzle wants its own schema DSL and migration tool; plain `pg` loses compile-time checking.

---

## 1. Create the project

1. Sign up at <https://supabase.com/dashboard> (GitHub login is fine) and create an
   **organization** if asked (your name or "The Blue Bridge"; plan **Free** to start).
2. Click **New project** and fill in:

| Field                 | What to enter                                                | Why                                                                                                                                                                                                                |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Name**              | `the-blue-bridge` (add `-dev` for a test project)            | A label only. The URL uses a random project ref.                                                                                                                                                                   |
| **Database password** | Click **Generate a password**, save it in a password manager | This is the `postgres` superuser password. Anyone with it can read and change all data. It goes in `DATABASE_URL`. **Secret.** You can reset it later (Database settings), but then you must update `server/.env`. |
| **Region**            | **South Asia (Mumbai)** (`ap-south-1`)                       | Closest to Jodhpur and to most members, so lowest latency. Put the API server in Mumbai too: each request makes database round-trips, and distance multiplies them. **The region cannot be changed later.**        |

3. Under **Security**, change the defaults:

   | Option                              | Set to  | Why                                                                                                                                                                                                                                                                                |
   | ----------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | **Enable Data API**                 | **Off** | It auto-generates a REST API over the `public` schema. We never use it: data goes through Express, and the browser uses supabase-js only for Auth, a separate service (`/auth/v1`). Off removes that attack surface. Re-enable later under **Settings → Data API** if ever needed. |
   | **Automatically expose new tables** | **Off** | When on, new tables are granted to the `anon` and `authenticated` roles. Supabase recommends off, and our lockdown migration revokes those grants anyway.                                                                                                                          |
   | **Enable automatic RLS**            | **On**  | An event trigger that enables Row Level Security on every new `public` table. Our migrations already do this; it's a second safety net if a future migration forgets.                                                                                                              |

   Migration `0004_lockdown.sql` protects the tables even if these are left at their
   defaults; the settings above add layers on top of it.

4. Click **Create new project** and wait 1–2 minutes for it to provision.

> **Free plan note:** free projects pause after a period of inactivity and have small
> limits. That's fine for development. Use Pro for production (also unlocks leaked-password
> protection, step 6).

Tip: create two projects, `-dev` and production, so you never test against real members.

---

## 2. Find your keys and URLs

| Value                          | Where                                                                                                               | Looks like                                                                                       | Secret?                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **Project URL**                | **Connect** button (top of the dashboard), or `https://<project-ref>.supabase.co` (the ref is in the dashboard URL) | `https://abcdxyz.supabase.co`                                                                    | No.                                                                                                                   |
| **Publishable key**            | **Settings → API Keys** ([link](https://supabase.com/dashboard/project/_/settings/api-keys))                        | `sb_publishable_...`                                                                             | **No.** Designed to be public; it ships in the browser bundle. It can only do what RLS allows, which here is nothing. |
| **Secret key**                 | **Settings → API Keys → Secret keys** (click to reveal, or **Create new secret key**)                               | `sb_secret_...`                                                                                  | **YES.** Bypasses RLS and can create or delete any user. Server only. Never in the client, never in git.              |
| **Database connection string** | **Connect** button → connection method (see step 3)                                                                 | `postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres` | **YES** once the password is in it.                                                                                   |

Legacy keys: older projects show `anon` (≈ publishable) and `service_role` (≈ secret) JWT
keys under a "Legacy" tab. Prefer the new `sb_` keys; Supabase is retiring the legacy ones.
The server rejects a publishable key in `SUPABASE_SECRET_KEY` at boot.

---

## 3. Choose the connection string (direct vs pooled)

Click **Connect** and you'll see three methods:

| Method                         | Host:port                                                        | Network                               | Use it for                                                                     |
| ------------------------------ | ---------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------ |
| **Direct connection**          | `db.<ref>.supabase.co:5432`, user `postgres`                     | **IPv6 only** (IPv4 is a paid add-on) | Long-running servers and migrations, **if** the machine has IPv6.              |
| **Session pooler** (Supavisor) | `aws-0-<region>.pooler.supabase.com:5432`, user `postgres.<ref>` | IPv4 + IPv6                           | Long-running servers on IPv4-only networks. Full session features.             |
| **Transaction pooler**         | same host, port **6543**                                         | IPv4 + IPv6                           | Serverless/edge functions with thousands of short connections. **Not for us.** |

**What a pooler does:** Postgres allows a limited number of connections. A pooler sits in
front and shares a few real connections among many clients. **Session mode** gives each
client a dedicated server connection for as long as it is connected, so everything behaves
like a direct connection. **Transaction mode** hands the connection back after every
transaction, which breaks session state (our migration runner holds a session-level lock).

**Recommendation for this project:** use the **Session pooler** string for both the API
and migrations. Our Express server is long-running and keeps its own small pool
(`DATABASE_POOL_MAX`, default 10), so it doesn't need transaction pooling. The session
pooler works from any network (many Indian ISPs and hosting platforms are still IPv4-only),
and it supports transactions, `SELECT … FOR UPDATE` and advisory locks. If your production
host has IPv6, the **Direct** string is marginally faster and equally correct.

Copy the string and replace `[YOUR-PASSWORD]` with the database password. If the password
contains `@ : / ? # & %` or spaces, percent-encode them (e.g. `@` → `%40`). Generated
passwords usually avoid this.

Keep the pool small: `DATABASE_POOL_MAX × number of API instances` must stay under your
plan's pooler client limit (shown in **Database settings**; small on Free).

### SSL (encryption in transit)

The connection must be encrypted, and in production the server certificate must be
verified, otherwise someone on the network path could impersonate the database.

1. **Database settings → SSL Configuration** ([link](https://supabase.com/dashboard/project/_/database/settings)):
   click **Download certificate**. Save it as `server/certs/supabase-ca.crt`
   (`server/certs/` is git-ignored; the certificate is public, but it's project config).
2. On the same page, turn on **Enforce SSL on incoming connections**, so plaintext
   connections are refused.
3. In `server/.env` set `DATABASE_SSL_CA_PATH=certs/supabase-ca.crt` and make sure
   `DATABASE_URL` has **no** `?sslmode=...` (the server refuses to start if both are set,
   because the URL would silently override the certificate check).

With the CA set, the API verifies the certificate chain and hostname (equivalent to
`sslmode=verify-full`). `NODE_ENV=production` refuses to start without it. For quick local
experiments you may leave it empty and append `?sslmode=require` to the URL instead
(encrypted but not verified).

---

## 4. Check the JWT signing keys

The API verifies each access token locally, against the public keys Supabase publishes,
instead of calling Supabase on every request. That needs **asymmetric** signing keys,
which are the default for projects created since October 2025.

1. Open `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json` in a browser.
2. You should see `{"keys":[{ ... "alg":"ES256" ... }]}` (or `RS256`). Then you're done.
3. If you see `{"keys":[]}`, the project still uses the legacy shared secret (HS256). Go to
   **Settings → JWT Keys** (page titled **JWT Signing Keys**,
   [link](https://supabase.com/dashboard/project/_/settings/jwt)), click
   **Migrate JWT secret**, then **Rotate keys**. Reload the JWKS URL to confirm.

Tokens last 1 hour by default and are refreshed automatically by supabase-js. A token
can't be "un-issued" before it expires, but that doesn't matter much here: the API reads
the user's status from the database on every request, so suspensions apply immediately.

---

## 5. Auth settings

Go to **Authentication → Sign In / Providers** ([link](https://supabase.com/dashboard/project/_/auth/providers)).

| Setting                                | Set it to              | What it is, what it changes, and why                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Email** provider                     | Enabled                | Email + password sign-in. On by default.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Allow new users to sign up**         | **OFF**                | When on, anyone holding the publishable key (which is public by design) can create an Auth account by calling Supabase's signup endpoint directly, skipping our referral check. Our API would still refuse them (no profile → 401), but they'd fill your Auth user list and could probe emails. **Off** means only the server, using the secret key's admin API, can create users, and it only does so after validating a referral code. The admin API is not affected by this switch. |
| **Confirm email**                      | Leave ON               | Normally makes self-signup users click an emailed link before they can sign in. Our server creates users as already confirmed (`email_confirm: true`), because **admin approval is the verification step**, so no email is sent and this setting has no effect on our flow. Trade-off: the email address isn't proven to belong to the applicant. Admins should sanity-check applications before approving them.                                                                       |
| **Minimum password length**            | **10**                 | Match the API (`server/src/features/auth/auth.schemas.ts`), which also requires 10. Length beats character rules for real-world strength.                                                                                                                                                                                                                                                                                                                                              |
| **Password requirements** (characters) | No required characters | Optional. If you require character classes, Supabase rejects weaker passwords at signup and the API shows "Choose a stronger password." on the password field. Prefer length.                                                                                                                                                                                                                                                                                                          |
| **Leaked password protection**         | ON when on Pro         | Rejects passwords found in public breach lists (HaveIBeenPwned). Pro plan and above.                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Allow anonymous sign-ins**           | OFF                    | (Authentication → Settings, [link](https://supabase.com/dashboard/project/_/auth)) We have no anonymous users.                                                                                                                                                                                                                                                                                                                                                                         |
| **Allow manual linking**               | OFF                    | Not used.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Other providers (Google, …)            | Disabled               | Out of scope. Enabling one would also let people create accounts without a referral.                                                                                                                                                                                                                                                                                                                                                                                                   |

**Authentication → URL Configuration:** set **Site URL** to your site's address
(`http://localhost:5180` for dev). Nothing in the current flow sends links, so it only
matters later (password reset, for instance).

---

## 6. Environment variables

### Server: `server/.env` (git-ignored; copy from `server/.env.example`)

| Variable               | Value                                                               | Secret  |
| ---------------------- | ------------------------------------------------------------------- | ------- |
| `NODE_ENV`             | `development` locally, `production` on the host                     | no      |
| `HOST` / `PORT`        | `127.0.0.1` / `3001` locally; `0.0.0.0` in containers               | no      |
| `LOG_LEVEL`            | `info`                                                              | no      |
| `TRUST_PROXY`          | `0` locally; number of proxies in front in production (usually `1`) | no      |
| `CORS_ORIGINS`         | Empty when site and API share an origin (default)                   | no      |
| `DATABASE_URL`         | Session pooler string with the password                             | **yes** |
| `DATABASE_POOL_MAX`    | `10`                                                                | no      |
| `DATABASE_SSL_CA_PATH` | `certs/supabase-ca.crt` (required in production)                    | no      |
| `SUPABASE_URL`         | `https://<project-ref>.supabase.co`                                 | no      |
| `SUPABASE_SECRET_KEY`  | `sb_secret_...`                                                     | **yes** |

### Client: `client/.env.local` (git-ignored; see `client/.env.example`)

| Variable                        | Value                               | Secret                |
| ------------------------------- | ----------------------------------- | --------------------- |
| `VITE_SUPABASE_URL`             | `https://<project-ref>.supabase.co` | no                    |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...`                | no (public by design) |

Anything starting with `VITE_` is compiled into the JavaScript every visitor downloads.
**Never put the secret key or the database URL in a `VITE_` variable.**

Confirm git ignores the real env files (each should print a matching `.gitignore` rule):

```sh
git check-ignore -v server/.env client/.env.local server/certs/supabase-ca.crt
```

The server validates every variable at boot and stops with a list of what's wrong (names
only, never values).

---

## 7. Create the tables (migrations) and seed categories

From the repo root, with `server/.env` filled in:

```sh
npm run db:migrate -w server   # → Applied: 0001_core_schema.sql, … 0005_category_colors.sql
npm run db:seed -w server      # → Categories inserted or updated: 5
```

Both are safe to run again ("Already up to date."; the seed just re-applies the colours). Migrations
are plain SQL in `server/src/db/migrations/`, applied in order, each in a transaction, and
recorded in `public.schema_migrations`. In the dashboard, **Table Editor** now shows the
tables, each marked as RLS-enabled.

The categories and their dot colours are Health (pink), Finance (green), Tech (blue),
Entrepreneurship (orange) and Legal (black), defined in `server/src/db/seed.ts`. To change
them, edit that file and run the seed again; the site reads the list from the API. A
category can't be deleted while a blog or ambassador uses it.

---

## 8. Create the first admin

There's no admin panel yet, and nobody can sign up without a referral code, so the first
admin (the "root") is created by hand.

1. **Authentication → Users → Add user → Create new user.** Enter your email and a strong
   password (10+ characters), tick **Auto Confirm User**, then **Create user**.
2. **SQL Editor → New query.** Paste [`server/src/db/manual/create-first-admin.sql`](../server/src/db/manual/create-first-admin.sql),
   replace the four `EDIT` values (your Auth email, name, phone with country code,
   occupation), and click **Run**.
3. The result shows **`root_referral_code`**, the first invitation code. Share it with
   the first members you invite. (An empty result means the email didn't match the Auth
   user from step 1.)

**How the circular reference is avoided:** `users.referral_code_id` is the code someone
signed up _with_, and `referral_codes.user_id` is the code's _owner_. The root admin
signed up with no code, so the script inserts the profile with `referral_code_id = null`
first, then the admin's own code. Ordinary signups follow the same order: profile (pointing
at the referrer's existing code), then the new user's own code. No deferred constraint
is needed.

---

## 9. Approve applicants (until the admin panel exists)

In the **SQL Editor**:

1. See who's waiting: run [`server/src/db/manual/approval-queue.sql`](../server/src/db/manual/approval-queue.sql)
   (email, name, occupation, applied role, categories, who referred them; oldest first).
2. Approve one: paste [`server/src/db/manual/approve-user.sql`](../server/src/db/manual/approve-user.sql),
   set the applicant's email and **your** (admin) email, and run it. It sets
   `status = 'approved'`, `reviewed_by` = you, `reviewed_at` = now. The role stays what
   they applied for (member or ambassador, with their categories).

The change applies on the applicant's next request. On the account page, **Check again**
picks it up. Their own referral code starts working at the same moment.

Rejection and suspension flows aren't built. In an emergency you can suspend someone with
`update public.users set status = 'suspended' where user_id = '…';`, which cuts off their
powers and invalidates their referral code immediately.

---

## 10. Verify the lockdown (RLS on, public roles see nothing)

1. **SQL Editor:** run [`server/src/db/manual/verify-lockdown.sql`](../server/src/db/manual/verify-lockdown.sql).
   Both result sets must be **empty** (no table without RLS, no grants to `anon` or
   `authenticated`).
2. **Try it as an attacker would**, with the publishable key in a terminal (it's public,
   so this is safe to type):

   ```sh
   curl "https://<project-ref>.supabase.co/rest/v1/users?select=*" \
     -H "apikey: sb_publishable_..."
   ```

   Expected: an error, never data. With the Data API off (step 1), the request is refused
   outright. If the Data API is on, you get `permission denied for table users` (code
   `42501`). Either is correct.

3. **Advisors → Security Advisor** may list "RLS enabled, no policy" for each table, as
   information. That is intended: no policy means no access for the Data API roles.

---

## 11. Try the whole flow locally

```sh
npm run dev                         # site on http://localhost:5180, API on :3001
```

1. Open <http://localhost:5180/sign-up>, enter the root referral code, fill in the details
   with a **different** email than your admin, and send the application.
2. You're signed in automatically and see **"Your account is waiting for approval"**.
3. Approve that email (step 9), then click **Check again**. The page now shows the
   welcome and the new member's own referral code.
4. Sign out, then sign in at `/sign-in` with your admin account. **Account** shows your
   role and root code.
5. In **Authentication → Users** you should see both users, created as confirmed.

---

## Going to production

Production uses a **separate** Supabase project. The full walkthrough (prod project, migrating
it, Render, Vercel and every environment variable) is in [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Troubleshooting

| Symptom                                                   | Likely cause                                                                                          |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Server exits with "Invalid environment configuration"     | Read the list: it names each bad variable.                                                            |
| Server exits with "Database is missing migrations"        | New code needs a schema change. Run `npm run db:migrate -w server`, then restart the server.          |
| `getaddrinfo ENOTFOUND db.<ref>.supabase.co` or a timeout | Direct connection on an IPv4-only network. Use the Session pooler string.                             |
| `password authentication failed`                          | Wrong password, or it needs percent-encoding. Pooler usernames are `postgres.<ref>`, not `postgres`.  |
| `self-signed certificate in certificate chain`            | SSL verification without the Supabase CA. Set `DATABASE_SSL_CA_PATH` (step 3).                        |
| Every signed-in API call returns 401                      | JWKS is empty (step 4), or `SUPABASE_URL` points at another project.                                  |
| Signed in, but "isn't linked to a Blue Bridge membership" | The Auth user has no profile row (e.g. created by hand without step 8's SQL).                         |
| Sign-up says "Too many attempts"                          | 10 referral-code checks per 15 minutes per IP. Wait, or restart the dev server.                       |
| Sign-in page says "Sign-in isn't set up"                  | `client/.env.local` is missing the `VITE_SUPABASE_*` values; restart `npm run dev` after adding them. |
