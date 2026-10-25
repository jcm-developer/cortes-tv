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
| `PUBLIC_SUPABASE_URL` | No | `src/lib/supabase.ts` | Supabase Project URL. CI: variable `SUPABASE_URL`. |
| `PUBLIC_SUPABASE_KEY` | No | `src/lib/supabase.ts` | Supabase anon or publishable key. CI: variable `SUPABASE_KEY`. |
| `PUBLIC_AUTH_USER` | No | `src/lib/auth.ts` | Build-time gate user, ignored with Supabase. CI: secret `AUTH_USER`. |
| `PUBLIC_AUTH_PASSWORD` | No | `src/lib/auth.ts` | Build-time gate password, ignored with Supabase. CI: secret `AUTH_PASSWORD`. |
| `SITE` | No | `astro.config.mjs` | Site origin, default `https://tu-usuario.github.io`. |
| `BASE` | No | `astro.config.mjs` | Base path, default `/cortes-tv`; `/` for a custom domain or a user site. |

Never commit a secret. Every `PUBLIC_*` variable ends up in the public bundle: the TMDB key
must be a read-only v3 key; the Supabase key must be the anon or publishable one, never the
`service_role` or secret key, because row level security is what protects the data; the
build-time login credentials only close the door, they are not real security
(`docs/domains/auth.md`). With no Supabase and no auth variables, the site is open.

## Supabase

Optional; without it the library stays in each browser. One-time setup:

1. Create a free project at supabase.com.
2. SQL Editor: run `supabase/schema.sql` (table `user_titles`, check constraints, row level
   security policies). It is safe to run again.
3. Authentication > Sign In / Providers: keep Email enabled and turn off "Allow new users to
   sign up", so nobody else can create an account.
4. Authentication > Users > Add user: create the account with email and password, with
   "Auto Confirm User" on.
5. Project Settings > API Keys: copy the Project URL and the anon (or publishable) key into
   `.env` locally and into the repository variables `SUPABASE_URL` and `SUPABASE_KEY`
   (Settings > Secrets and variables > Actions > Variables) for the deploy.

The first sign-in on a device that already had a local library merges it into the account
(`docs/domains/library.md`).

## Local development

```bash
pnpm install
cp .env.example .env      # then set PUBLIC_TMDB_API_KEY
pnpm dev                  # dev server
pnpm check                # astro check: types and diagnostics
pnpm build                # static build into dist/
pnpm preview              # serve the build
node scripts/generate-icons.mjs   # regenerate public/icons/*.png
```

## Scheduled jobs

None.

## Deploy

GitHub Pages, through `.github/workflows/deploy.yml`, on every push to `main` and on manual
dispatch. It installs with `pnpm install --frozen-lockfile`, builds with `SITE` and `BASE`
derived from the repository owner and name, adds `dist/.nojekyll` and publishes `dist/`. Pages
must be set to "Source: GitHub Actions" in the repository settings.

`pnpm-workspace.yaml` allows the `esbuild` and `sharp` build scripts (`allowBuilds`, the
pnpm 11 format) so the frozen install succeeds in CI.

## CI

- `deploy.yml`: build and deploy, described above.
- `standards.yml`: `node scripts/check-docs.mjs` and the commit message check
  (`.githooks/commit-msg`) over every pushed commit. Both block.

## Costs

None: GitHub Pages and the TMDB API are free for this use. TMDB rate limits apply per key
(`TmdbError` with status 429). Supabase free tier: the library is a few hundred small rows,
far below the limits, but a free project pauses after 7 days without requests and must be
restored from the dashboard; daily use keeps it awake.
