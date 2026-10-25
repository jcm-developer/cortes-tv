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
Status: accepted
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
