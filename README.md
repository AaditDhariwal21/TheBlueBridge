# The Blue Bridge

Website for The Blue Bridge, a community connecting professional women with Jodhpur roots.
An npm-workspaces monorepo:

```
client/   Frontend. React 19, TypeScript (strict), Vite 8, React Router 8, Tailwind CSS 4.
server/   Backend API. Node + TypeScript, run directly by Node (no build step).
docs/     Design tokens, component inventory, reference captures, screenshots.
scripts/  Repo-level tooling (the combined dev runner).
```

## Getting started

Requires Node 22.13 or later (Node 24 LTS recommended for production).

```sh
npm install          # once, from the repo root: installs both workspaces
npm run dev          # client + server together
```

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
| `npm run preview -w client`       | Serve the built client locally (proxies `/api`)                                     |
| `npm run start -w server`         | Run the API in production mode                                                      |
| `npm run images -w client`        | Regenerate responsive images from `client/src/assets/source/`                       |

Add a dependency to one side with `npm install <pkg> -w client` (or `-w server`).
Ask first (see the project brief).

## How client and server talk

The client always calls same-origin `/api/...`. In development, Vite proxies `/api` to the
server (`client/vite.config.ts`). In production, put both behind one origin using a
reverse proxy or host rewrites, so no CORS setup is needed.

## Where things live

- `client/src/styles/tokens.css`: design tokens, the only place colours, fonts and sizes are
  defined. The written reference is [`docs/design-tokens.md`](docs/design-tokens.md).
- `client/src/app/`: router, route table with per-page meta, head management, site constants.
- `client/src/pages/`: thin pages that compose `client/src/components/sections/`.
- `client/src/lib/submitWaitlist.ts`: **stub.** This is the single place to connect the
  waitlist to the API.
- `client/src/features/blogs/`: the Blogs section (feed, blog pages, Query Blogs, threaded
  comments). All data goes through `features/blogs/api/index.ts`, which today exports an
  **in-memory mock** (`mockBlogsApi.ts`, seeded from `data/`; resets on reload). Swap it for
  an HTTP implementation of the `BlogsApi` contract and nothing else changes. The mock
  signed-in member is `client/src/app/currentUser.ts`.
- `server/src/app.ts`: route table. `server/src/routes/`: one file per endpoint.

## Configuration

- `client/.env`: **public** build settings only (`VITE_SITE_URL`). It is committed, and
  everything in it ends up in the browser bundle.
- `server/.env`: server settings and secrets. Git-ignored. Copy `server/.env.example` to
  start.

## Deployment notes

- The client is a single-page app: the host must rewrite unknown paths to `/index.html`.
- The static `index.html` carries the Home page's meta tags, so link previews for other
  pages show Home's details until prerendering is added. Head management is centralized in
  `client/src/app/head.ts` to make that switch easy.
