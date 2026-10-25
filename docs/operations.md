# Operations

Environment variables, deploy, CI and running costs. Owner of every fact about how Cortes TV
runs outside the code itself.

## Environment variables

All variables are read at build time through `import.meta.env` and baked into the static
bundle. `.env.example` lists them for local development; CI sets them in
`.github/workflows/deploy.yml`.

| Variable | Required | Read in | Purpose |
|---|---|---|---|
| `PUBLIC_TMDB_API_KEY` | Yes | `src/lib/tmdb.ts` | TMDB v3 API key. CI: secret `TMDB_API_KEY`. |
| `PUBLIC_TMDB_LANG` | No (`es-ES`) | `src/lib/tmdb.ts` | Language of TMDB responses. |
| `PUBLIC_TMDB_REGION` | No (`ES`) | `src/lib/tmdb.ts` | Region for "now playing" and watch providers. |
| `PUBLIC_CONVEX_URL` | No | `src/lib/convex.ts` | Convex deployment URL. CI: set by `convex deploy` from the secret `CONVEX_DEPLOY_KEY`. |
| `PUBLIC_AUTH_USER` | No | `src/lib/auth.ts` | Build-time gate user, ignored with Convex. CI: secret `AUTH_USER`. |
| `PUBLIC_AUTH_PASSWORD` | No | `src/lib/auth.ts` | Build-time gate password, ignored with Convex. CI: secret `AUTH_PASSWORD`. |

Convex deployment variables (set in the Convex dashboard or with `npx convex env set`, never in
the bundle):

| Variable | Read in | Purpose |
|---|---|---|
| `AUTH_ALLOWED_EMAIL` | `convex/auth.ts` | The only email that can create an account and sign in. |
| `JWT_PRIVATE_KEY`, `JWKS` | Convex Auth | Signing key pair for session tokens (`npx @convex-dev/auth`). |
| `SITE_URL` | Convex Auth | The site origin, for example `https://<user>.github.io/cortes-tv`. |
| `SITE` | No | `astro.config.mjs` | Site origin, default `https://tu-usuario.github.io`. |
| `BASE` | No | `astro.config.mjs` | Base path, default `/cortes-tv`; `/` for a custom domain or a user site. |

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
   the production deployment (`--prod`), with `SITE_URL` set to the Pages URL.
3. Convex dashboard > the project > Settings > Deploy keys: create a production deploy key and
   store it as the repository secret `CONVEX_DEPLOY_KEY`.
4. Push: `deploy.yml` runs `convex deploy`, which pushes `convex/` to production and builds the
   site with `PUBLIC_CONVEX_URL` pointing at it.
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

GitHub Pages, through `.github/workflows/deploy.yml`, on every push to `main` and on manual
dispatch. It installs with `pnpm install --frozen-lockfile`, deploys the Convex functions when the
`CONVEX_DEPLOY_KEY` secret exists (`convex deploy --cmd "pnpm run build"`, which also injects
`PUBLIC_CONVEX_URL`), builds with `SITE` and `BASE` derived from the repository owner and name, adds `dist/.nojekyll` and publishes `dist/`. Pages
must be set to "Source: GitHub Actions" in the repository settings.

The deploy needs no cache step: `public/sw.js` serves pages network first, so the installed
app shows a new deploy on its next open (`docs/domains/ui.md`).

`pnpm-workspace.yaml` allows the `esbuild` and `sharp` build scripts (`allowBuilds`, the
pnpm 11 format) so the frozen install succeeds in CI.

## CI

- `deploy.yml`: build and deploy, described above.
- `standards.yml`: `node scripts/check-docs.mjs` and the commit message check
  (`.githooks/commit-msg`) over every pushed commit. Both block.

## Costs

None: GitHub Pages and the TMDB API are free for this use. TMDB rate limits apply per key
(`TmdbError` with status 429). Convex free plan: the library is a few hundred small rows and a
handful of function calls per session, far below the limits; it is limited by usage, not
paused for inactivity.
