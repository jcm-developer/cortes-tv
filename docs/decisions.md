# Decisions

Why Cortes TV is built the way it is. One entry per structural decision, newest last.
Append an entry when you make or reverse one; never rewrite an old entry, mark it superseded
instead.

Template:

```
## D<n>. <Title> (<YYYY-MM-DD or "historical">)
Status: accepted | superseded by D<m>
Context: what forced the choice.
Decision: what was chosen.
Consequences: what it costs, what it rules out.
```

## D1. Static site on GitHub Pages (historical)
Status: accepted
Context: a personal tool for one user, with no budget for servers.
Decision: Astro static build deployed to GitHub Pages by GitHub Actions.
Consequences: no backend. Secrets cannot be kept secret: the TMDB key and the login
credentials ship in the bundle. Real auth or shared data would need a backend (D3).

## D2. One client-only Svelte island (historical)
Status: accepted
Context: the app depends on `localStorage` and calls TMDB from the browser, so there is
nothing useful to render on the server.
Decision: `src/pages/index.astro` mounts `App.svelte` with `client:only="svelte"`; navigation
between Home, Search and Lists is in-memory state (`activeTab` in `src/lib/ui.ts`), not routes.
Consequences: a single page and URL; the browser back button is wired by hand to close the
detail view. Deep links to a title are not possible without adding routing.

## D3. Normalized data in localStorage, ready for a database (historical)
Status: superseded by D6
Context: data must persist without a backend, but a move to an external database (for
example Supabase) should not require rewriting the app.
Decision: one versioned `AppData` document in `localStorage`, with `titles` as a normalized
table keyed by `mediaType:id` and `lists[].itemKeys` as the join table between lists and
titles. JSON export and import serve as backup and device transfer.
Consequences: data lives in one browser until exported. Storage quota errors are swallowed.

## D4. Tailwind with CSS variable tokens (historical)
Status: accepted
Context: the Apple Liquid Glass design needs one token set for light and dark mode.
Decision: tokens as CSS variables in `src/styles/global.css`, mapped into the Tailwind theme;
`applyBaseStyles: false` so the base layer is owned by `global.css`. Rules in `DESIGN.md`.
Consequences: a new visual value goes into the token scale first, not inline.

## D5. Project standards (2026-10-25)
Status: accepted
Context: the repository had no agent docs, no docblocks and no checks on commits or docs.
Decision: adopt project-standards: `AGENTS.md`, `docs/`, Google-style docblocks, one-line
Conventional Commits, `scripts/check-docs.mjs` in the pre-commit hook and in CI.
Consequences: code, comments and docs are English from now on; UI copy and `DESIGN.md` stay
Spanish.

## D6. Two statuses instead of user lists (2026-10-25)
Status: accepted
Context: the user had 4 lists and a 1 to 5 rating that only made sense for titles already
seen; rating needed the title in some list first, and recommendations need to know what was
watched and how it was rated.
Decision: drop user lists. Every stored title has `status` `pending` or `watched`; only watched
titles carry `rating` and `watchedAt`. `AppData` v2 is a single `titles` map, one row per title,
with `updatedAt` for merges. `normalize` migrates v1 documents and backups.
Consequences: no custom lists or ordering. One title maps to one database row, which keeps a
later sync simple. Old v1 backups still import.

## D7. Optional Supabase sync with local-first storage (2026-10-25)
Status: superseded by D8
Context: the app is used on desktop and as an installed iPhone PWA, whose storage is separate
from Safari, so `localStorage` alone left each device with its own library. The build-time
login (D1) is not security.
Decision: when `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_KEY` are set, log in with Supabase
email and password and sync the library with a `user_titles` table under row level security.
`localStorage` stays the copy the UI reads; a dirty-key outbox sends changes, a pull on
sign-in, reconnection and focus brings the server state. Without the variables, the app works
as before.
Consequences: free tier, but a free project pauses after a week without requests. The
supabase-js client loads lazily. Conflicts are last write wins per title. Still no server code
of our own: the site stays static.

## D8. Convex instead of Supabase for login and sync (2026-10-25)
Status: accepted
Context: D7 was built but never configured. The user prefers Convex: changes reach the other
device live through a query subscription, and its free plan is limited by usage, not paused
after a week without requests.
Decision: Convex Auth (Password provider, one email allowed by `AUTH_ALLOWED_EMAIL`) and a
`titles` table reached only through `convex/titles.ts`, which scopes every call to the
signed-in user. The client keeps the local-first design of D7 (dirty-key outbox, the local
library as the copy the UI reads) and replaces polling with a live subscription. The token
handling of `@convex-dev/auth/react` is ported to plain TypeScript (`src/lib/convex.ts`)
because the app is Svelte.
Consequences: the repository now holds server functions in `convex/`, deployed by CI with a
deploy key before the static build. Convex Auth needs JWT keys set on the deployment once.
Without `PUBLIC_CONVEX_URL` the app still runs local only.

## D9. Cloudflare Pages instead of GitHub Pages (2026-10-25)
Status: accepted
Context: GitHub Pages served the site under `/cortes-tv` and needs a public repository on the
free plan. The user created a Cloudflare Pages project connected to the repository.
Decision: Cloudflare builds and hosts the site at the root of `cortes-tv.pages.dev`.
`scripts/build-site.mjs` deploys the Convex functions on `main` and builds the site; preview
branches only build. `.github/workflows/deploy.yml` is removed; GitHub Actions keeps only the
standards checks. Hosting in D1 changes; the rest of D1 (static site) stands.
Consequences: build settings and variables live in the Cloudflare dashboard (documented in
`docs/operations.md`). pnpm 11 is pinned in the build command, not taken from the build
image. Response headers come from `public/_headers`.

## D10. Liquid Glass chrome from the vendored skill, one layout for every screen (2026-10-25)
Status: accepted
Context: the first design used a hand-made frosted recipe (24px blur, glass on content) and
two navigations (a desktop top bar and a mobile tab bar), which drifted apart and caused most
of the iPhone bugs: pages scrolling behind overlays, stuck hover states, misplaced arrows and
menus.
Decision: the chrome layer is ported from the `liquid-glass` skill into `src/styles/glass.css`
(tokens, button, tab bar, segmented control, search, popover, toast, sheet, with the four
accessibility fallbacks), its scheme driven by the app theme. One floating tab bar and a
settings button per tab header serve every screen size. Posters and other content stay
opaque. `liquid-glass.js` is not loaded: Svelte drives the indicators and the refraction it
adds never runs on touch devices.
Consequences: glass appears only on the tab bar, floating buttons, sheets, menus and toasts,
which keeps iOS under the three-surface budget. Refraction is not available on desktop
Chromium; adding the script later only needs `data-refract` on the bars.
