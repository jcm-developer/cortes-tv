# Operations

Environment variables, deploy, CI and running costs. Owner of every fact about how Cortes TV
runs outside the code itself.

## Environment variables

All variables are read at build time through `import.meta.env` and baked into the static
bundle. `.env.example` lists them for local development; production sets them in the
Cloudflare Pages project (Settings > Variables and Secrets).

| Variable | Required | Read in | Purpose |
|---|---|---|---|
| `PUBLIC_TMDB_API_KEY` | Yes | `src/lib/tmdb.ts` | TMDB v3 API key. |
| `PUBLIC_TMDB_LANG` | No (`es-ES`) | `src/lib/tmdb.ts` | Language of TMDB responses. |
| `PUBLIC_TMDB_REGION` | No (`ES`) | `src/lib/tmdb.ts` | Region for "now playing" and watch providers. |
| `PUBLIC_CONVEX_URL` | No | `src/lib/convex.ts` | Convex deployment URL. Production: injected by `convex deploy` (`scripts/build-site.mjs`). |
| `PUBLIC_AUTH_USER` | No | `src/lib/auth.ts` | Build-time gate user, ignored with Convex. |
| `PUBLIC_AUTH_PASSWORD` | No | `src/lib/auth.ts` | Build-time gate password, ignored with Convex. |
| `SITE` | No | `astro.config.mjs` | Site origin, default `https://cortes-tv.pages.dev`. |
| `BASE` | No | `astro.config.mjs` | Base path, default `/`. |
| `CONVEX_DEPLOY_KEY` | No | `scripts/build-site.mjs` | Convex production deploy key; build only, never in the bundle. |
| `NODE_VERSION`, `SKIP_DEPENDENCY_INSTALL` | Cloudflare | Cloudflare build image | `22` and `true` (see "Deploy"). |

Convex deployment variables (set in the Convex dashboard or with `npx convex env set`, never in
the bundle):

| Variable | Read in | Purpose |
|---|---|---|
| `AUTH_ALLOWED_EMAIL` | `convex/auth.ts` | The only email that can create an account and sign in. |
| `JWT_PRIVATE_KEY`, `JWKS` | Convex Auth | Signing key pair for session tokens (`npx @convex-dev/auth`). |
| `SITE_URL` | Convex Auth | The site origin, `https://cortes-tv.pages.dev`. |

Never commit a secret. Every `PUBLIC_*` variable ends up in the public bundle: the TMDB key
must be a read-only v3 key; the Convex URL is public by design, because every function checks the
session; the build-time login credentials only close the door, they are not real security
(`docs/domains/auth.md`). With no Convex and no auth variables, the site is open.

## Convex

Optional; without it the library stays in each browser. One-time setup, from the repository:

1. `npx convex login`, then `npx convex dev --once` and choose "create a new project". It writes
   `.env.local` (git-ignored) with the dev deployment and its `CONVEX_URL`.
2. `npx @convex-dev/auth --skip-git-check` (or by hand: `npx convex env set` for `JWT_PRIVATE_KEY`,
   `JWKS`, `SITE_URL`) and `npx convex env set AUTH_ALLOWED_EMAIL <your email>`. Repeat both on
   the production deployment (`--prod`), with `SITE_URL` set to `https://cortes-tv.pages.dev`.
3. Convex dashboard > the project > Settings > Deploy keys: create a production deploy key and
   store it as the encrypted Cloudflare variable `CONVEX_DEPLOY_KEY` ("Deploy").
4. Push: the Cloudflare build runs `convex deploy`, which pushes `convex/` to production and
   builds the site with `PUBLIC_CONVEX_URL` pointing at it.
5. Open the site, "Primera vez: crear cuenta" with the allowed email, then sign in on the other
   devices.

Locally, set `PUBLIC_CONVEX_URL` in `.env` to the dev `CONVEX_URL` and keep `npx convex dev`
running while you change `convex/`. `convex/_generated/` is committed; `convex dev` and
`convex codegen` refresh it. Without an account, `CONVEX_AGENT_MODE=anonymous npx convex dev`
runs a local backend on port 3210 for tests.

The first sign-in on a device that already had a local library merges it into the account
(`docs/domains/library.md`).

## Local development

```bash
pnpm install
cp .env.example .env      # then set PUBLIC_TMDB_API_KEY (and PUBLIC_CONVEX_URL for sync)
pnpm dev                  # dev server
npx convex dev            # only with Convex: pushes convex/ on every change
pnpm check                # astro check: types and diagnostics
pnpm build                # static build into dist/
pnpm preview              # serve the build (the service worker runs here, not in dev)
node scripts/generate-icons.mjs   # render public/icons/icon.svg to the PNG icons (needs Chrome or Edge)
```

## Scheduled jobs

None.

## Deploy

Cloudflare Pages, project `cortes-tv`, connected to the GitHub repository: every push to `main`
publishes `https://cortes-tv.pages.dev`; other branches get preview URLs. Project settings:

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `npx pnpm@11.2.2 install --frozen-lockfile && npx pnpm@11.2.2 run build:site` |
| Build output directory | `dist` |
| Variables | `NODE_VERSION` `22`, `SKIP_DEPENDENCY_INSTALL` `true`, `PUBLIC_TMDB_API_KEY`, `CONVEX_DEPLOY_KEY` (encrypted) |

- The build command pins pnpm 11 through `npx` instead of relying on the pnpm of the
  Cloudflare build image; `SKIP_DEPENDENCY_INSTALL` stops the image's own install, which would
  run with that other pnpm against the pnpm 11 lockfile.
- `scripts/build-site.mjs` runs `convex deploy --cmd "npm run build"` on `main` when
  `CONVEX_DEPLOY_KEY` is set; preview branches (`CF_PAGES_BRANCH`) and builds without the key
  run `astro build` only, so they never change production functions.
- `public/_headers`: `sw.js` is never cached by the browser, so a deploy reaches installed
  apps on their next open; `/assets/*` is immutable (hashed names).
- `pnpm-workspace.yaml` allows the `esbuild` and `sharp` build scripts (`allowBuilds`, the
  pnpm 11 format) so the frozen install succeeds.

## CI

- `standards.yml` (GitHub Actions): `node scripts/check-docs.mjs` and the commit message check
  (`.githooks/commit-msg`) over every pushed commit. Both block. The deploy itself runs on
  Cloudflare, not in GitHub Actions.

## Costs

None: Cloudflare Pages (free plan: 500 builds a month, unlimited bandwidth) and the TMDB API
are free for this use. TMDB rate limits apply per key
(`TmdbError` with status 429). Convex free plan: the library is a few hundred small rows and a
handful of function calls per session, far below the limits; it is limited by usage, not
paused for inactivity.
