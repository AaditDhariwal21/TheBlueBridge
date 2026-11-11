# Deployment: dev and prod

Two completely separate environments. **Local development always uses the dev Supabase
project; the deployed site always uses the prod project.** Nothing is shared between them:
not users, not data, not keys.

```
LOCAL (your laptop)                         DEPLOYED
───────────────────                         ────────
Vite :5180 ──/api proxy──▶ API :3001        Browser ──▶ Vercel (static site, vercel.json)
                              │                │
                              ▼                └──https──▶ Render (API) ──▶ Supabase PROD
                       Supabase DEV                         CORS_ORIGINS = the Vercel site
server/.env, client/.env.local              Render + Vercel environment variables
```

**Why the browser calls Render directly (CORS) instead of Vercel proxying `/api`:** behind a
Vercel rewrite every request reaches Render from Vercel's servers, so all members would share
Vercel's IP and the per-IP limits (e.g. 10 referral-code tries per 15 minutes) would apply to
everyone at once. Calling Render directly keeps real client IPs, avoids a second hop, and avoids
Vercel's proxy timeouts while a Render instance wakes up. Render sits behind Cloudflare, which
puts the visitor's IP in `CF-Connecting-IP` (and rejects requests that try to set it
themselves); the API reads it there (`CLIENT_IP_HEADER`). `X-Forwarded-For` is no use on Render:
the chain of Render proxies in it has no fixed length.

Where each value lives:

| File / place                   | Environment | Committed? | Holds                                                                |
| ------------------------------ | ----------- | ---------- | -------------------------------------------------------------------- |
| `server/.env`                  | dev         | no         | dev server settings and secrets                                      |
| `client/.env.local`            | dev         | no         | dev Supabase URL + publishable key                                   |
| `server/.env.production.local` | prod        | no         | prod database settings, only for running migrations from your laptop |
| Render → Environment           | prod        | no         | prod server settings and secrets                                     |
| Vercel → Environment Variables | prod        | no         | prod public build settings                                           |

Never copy prod values into `server/.env` or `client/.env.local`.

---

## 1. Create the prod Supabase project

Follow [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) steps 1–6 again, on a **new** project:

- Name `the-blue-bridge-prod`, region **South Asia (Mumbai)**, a new strong database password.
- Plan: **Pro** is recommended for production (daily backups, no pausing, leaked-password
  protection).
- Security options: Data API **off**, automatic RLS **on** (same as dev).
- Auth: **Allow new users to sign up OFF**, minimum password length **10**, anonymous
  sign-ins off. Check `https://<prod-ref>.supabase.co/auth/v1/.well-known/jwks.json` shows
  an ES256 key.
- Database settings → SSL Configuration: **Enforce SSL** on, and **Download certificate**.
- Authentication → URL Configuration: **Site URL** = your Vercel URL (after step 4).

Keep the prod URL, publishable key, secret key and Session pooler connection string to hand
(in your password manager, not in chat or files in the repo).

## 2. Prepare the prod database from your laptop

1. Save the prod certificate as `server/certs/supabase-ca-prod.crt` (`server/certs/` is
   git-ignored).
2. Create `server/.env.production.local` (git-ignored) with exactly:

   ```
   NODE_ENV=production
   DATABASE_URL=<prod Session pooler string, password filled in, no ?sslmode>
   DATABASE_SSL_CA_PATH=certs/supabase-ca-prod.crt
   ```

3. From the repo root:

   ```sh
   npm run db:migrate:prod -w server   # creates every table in PROD
   npm run db:seed:prod -w server      # the five categories
   ```

4. Create the prod admin: in the **prod** dashboard, Authentication → Users → Add user (Auto
   Confirm), then run [`server/src/db/manual/create-first-admin.sql`](../server/src/db/manual/create-first-admin.sql)
   in the **prod** SQL Editor. The result is the prod root referral code.
5. Run [`verify-lockdown.sql`](../server/src/db/manual/verify-lockdown.sql) in the prod SQL
   Editor: both results must be empty.

The dev scripts (`db:migrate`, `db:seed`) read `server/.env` and therefore always hit dev; the
`:prod` ones read only `server/.env.production.local`.

## 3. Render (the API)

Render → **New → Web Service** → connect the GitHub repo.

| Setting            | Value                                                                                                                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name               | e.g. `the-blue-bridge-api` (gives `https://the-blue-bridge-api.onrender.com`)                                                                                                                                           |
| Region             | **Singapore** (closest to the Mumbai database; Render has no India region)                                                                                                                                              |
| Branch             | `main`                                                                                                                                                                                                                  |
| Root Directory     | empty (repo root)                                                                                                                                                                                                       |
| Runtime            | Node                                                                                                                                                                                                                    |
| Build Command      | `npm ci`                                                                                                                                                                                                                |
| Start Command      | `npm run start -w server`                                                                                                                                                                                               |
| Health Check Path  | `/api/health`                                                                                                                                                                                                           |
| Instance type      | **Starter or above** recommended. Free instances sleep after 15 minutes and take about a minute to wake; the site retries for ~30 seconds, so the first visit after a sleep can still show "couldn't reach its server". |
| Pre-Deploy Command | `npm run db:migrate -w server` (paid instances). Applies new migrations before each deploy.                                                                                                                             |

**Secret File** (Environment → Secret Files): name `supabase-ca.crt`, contents = the prod
certificate. Render mounts it at `/etc/secrets/supabase-ca.crt`.

On the free instance type there is no Pre-Deploy Command: run `npm run db:migrate:prod -w server`
from your laptop **before** pushing code that adds a migration. The API refuses to start while
a migration is missing, so a forgotten one fails loudly instead of serving errors.

## 4. Vercel (the site), first pass

You need the site's URL before the API can start (`CORS_ORIGINS`), and the API's URL before
the site can reach it (`VITE_API_URL`). So Vercel is set up in two passes around Render.

1. Vercel → **Add New → Project** → **Import** the GitHub repo.
2. On **Configure Project**:
   - **Project Name**: e.g. `the-blue-bridge`. This decides the URL:
     `https://the-blue-bridge.vercel.app` if that name is free, otherwise Vercel adds a suffix.
   - **Framework Preset**: Vite. **Root Directory**: `./` (the repo root). Leave the build
     settings alone: `vercel.json` sets them.
   - Expand **Environment Variables** and add the two you already know:
     `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (prod values).
3. Click **Deploy**. The site loads, but sign-in and Blogs can't reach the API yet. That's expected.
4. Open the project → **Settings → Domains** and copy the production domain, e.g.
   `https://the-blue-bridge.vercel.app`. This is **your site URL** from here on.

## 5. Wire them together

1. **Render**: create the service (step 3 above) with `CORS_ORIGINS` = your site URL from 4.4.
   Copy its URL from the top of the service page, e.g. `https://the-blue-bridge-api.onrender.com`,
   and check `https://<render>.onrender.com/api/health` returns `{"status":"ok"}`.
2. **Vercel, second pass**: project → **Settings → Environment Variables**. For each, type the
   **Key** and **Value**, tick only **Production**, and **Save**:
   - `VITE_API_URL` = the Render URL (no `/api`, no trailing slash)
   - `VITE_SITE_URL` = your site URL
3. **Redeploy**: **Deployments** → the latest one → **⋯** → **Redeploy**. `VITE_` values are
   built into the site's JavaScript, so a change only takes effect after a redeploy.
4. **Supabase prod** → Authentication → URL Configuration → **Site URL** = your site URL.
5. **Check**: the site loads; sign in with the prod admin; Blogs and Account load.

Preview deployments get their own URLs, which the API does not allow (CORS). Test on the
Production URL, or add a fixed preview domain to `CORS_ORIGINS`.

With a custom domain later: update `CORS_ORIGINS`, `VITE_SITE_URL` (+ redeploy), the Supabase
Site URL, and, if the API moves to its own domain, `connect-src` in `vercel.json`.

---

## Environment variables

### Render (API, prod)

| Name                   | Value                                                                            | Secret  |
| ---------------------- | -------------------------------------------------------------------------------- | ------- |
| `NODE_ENV`             | `production`                                                                     | no      |
| `NODE_VERSION`         | `22`                                                                             | no      |
| `HOST`                 | `0.0.0.0`                                                                        | no      |
| `LOG_LEVEL`            | `info`                                                                           | no      |
| `CLIENT_IP_HEADER`     | `cf-connecting-ip` (the visitor's IP, for rate limits)                           | no      |
| `CORS_ORIGINS`         | `https://<your-site>.vercel.app` (comma-separated if several, no trailing slash) | no      |
| `DATABASE_URL`         | prod Session pooler string, password filled in, **no** `?sslmode`                | **yes** |
| `DATABASE_POOL_MAX`    | `10`                                                                             | no      |
| `DATABASE_SSL_CA_PATH` | `/etc/secrets/supabase-ca.crt` (plus the Secret File)                            | no      |
| `SUPABASE_URL`         | `https://<prod-ref>.supabase.co`                                                 | no      |
| `SUPABASE_SECRET_KEY`  | prod `sb_secret_…`                                                               | **yes** |

Do **not** set `PORT`: Render provides it. The API refuses to start if anything is missing or
wrong (for example a non-https `CORS_ORIGINS`, or no certificate path in production).

### Vercel (site, prod)

| Name                            | Value                                                        | Secret |
| ------------------------------- | ------------------------------------------------------------ | ------ |
| `VITE_SITE_URL`                 | your site URL from Vercel → Settings → Domains (second pass) | no     |
| `VITE_API_URL`                  | the Render URL, no `/api`, no trailing slash (second pass)   | no     |
| `VITE_SUPABASE_URL`             | `https://<prod-ref>.supabase.co`                             | no     |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | prod `sb_publishable_…`                                      | no     |

Everything here is public by design (it ships in the site's JavaScript). Never put the secret
key or the database URL in Vercel.

### Local (dev) — unchanged

`server/.env` and `client/.env.local` as set up in `SUPABASE_SETUP.md`, pointing at the dev
project. Leave `VITE_API_URL` and `CORS_ORIGINS` unset locally.

---

## After launch

- **Schema changes:** add a migration, apply it to dev (`db:migrate`), then to prod (Pre-Deploy
  Command, or `db:migrate:prod` before pushing).
- **Client IPs:** rate limits count by `CF-Connecting-IP` (`CLIENT_IP_HEADER`). Check it with
  `curl -si https://<render>.onrender.com/api/health`: the `ratelimit-policy` header's `pk` must
  stay the same across requests and must not change when you send a made-up `X-Forwarded-For`.
  Leave `TRUST_PROXY` unset on Render. If the API ever moves off Cloudflare, unset
  `CLIENT_IP_HEADER` and set `TRUST_PROXY` to the number of proxies in front instead.
- **Scaling past one API instance:** rate limits are counted in memory; add a shared store first
  (`server/src/middleware/rateLimits.ts`).
- **Approvals:** until the admin panel exists, use `approval-queue.sql` and `approve-user.sql` in
  the **prod** SQL Editor.
