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
| `PUBLIC_AUTH_USER` | No | `src/lib/auth.ts` | Login user. CI: secret `AUTH_USER`. |
| `PUBLIC_AUTH_PASSWORD` | No | `src/lib/auth.ts` | Login password. CI: secret `AUTH_PASSWORD`. |
| `SITE` | No | `astro.config.mjs` | Site origin, default `https://tu-usuario.github.io`. |
| `BASE` | No | `astro.config.mjs` | Base path, default `/cortes-tv`; `/` for a custom domain or a user site. |

Never commit a secret. Every `PUBLIC_*` variable ends up in the public bundle: the TMDB key
must be a read-only v3 key, and the login credentials only close the door, they are not real
security (`docs/domains/auth.md`). With both auth variables empty, the site is open.

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
(`TmdbError` with status 429).
