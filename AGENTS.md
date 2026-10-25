# AGENTS.md

Entry point for every AI agent working in this repository. It is always loaded, so it stays
short: what Cortes TV is, the rules that apply to every task, where the rest of the
knowledge lives, and how to keep that knowledge current.

## 1. How to work here

1. **Read this file, then only what the task needs.** The documentation is split by scope
   (Section 3). Open the files the task touches in the map before writing code; do not read
   everything.
2. **These docs win over your defaults.** `AGENTS.md` files, `docs/` and `DESIGN.md` (when it
   exists) are the source of truth for architecture, patterns, style and design. Process skills
   say how to work, not what the rules are; on any conflict, these docs win.
3. **Apply the rules silently.** Do not announce which rule you are applying.
4. **The code is ground truth for structure.** Do not invent directories, layers or
   conventions. When a doc and the code disagree, trust the code and fix the doc (Section 4).
5. **Leave the docs as current as the code** (Section 4). A task is not done while a doc still
   describes the old behaviour.

## 2. Project

Cortes TV is a personal movie and TV show tracker with an Apple Liquid Glass look, built for
one user on desktop and iPhone. It is a fully static site: titles come from TheMovieDB (TMDB)
straight from the browser, and the user's library (pending and watched titles, ratings and
watched dates) lives in `localStorage` and, when Supabase is configured, syncs with a
Supabase table behind an email and password login. JSON export and import serve as backups.
The UI copy is in Spanish.

| Layer | Technology |
|---|---|
| Site and build | Astro 5 (static output, one client-only island) |
| UI | Svelte 5 (runes), TypeScript |
| Styling | Tailwind CSS 3, design tokens as CSS variables (`DESIGN.md`) |
| Data | TMDB API v3 (read only), `localStorage`, optional Supabase (auth and sync) |
| Package manager | pnpm 11 |
| Hosting | GitHub Pages, deployed by GitHub Actions |

<!-- check-docs: map -->
```
cortes-tv/
├── .agents/skills/              # Vendored agent skills (liquid-glass), pinned in skills-lock.json
├── .github/
│   ├── workflows/deploy.yml     # Build and deploy to GitHub Pages on push to main
│   └── workflows/standards.yml  # Docs check and commit message check
├── .githooks/                   # commit-msg and pre-commit hooks
├── docs/                        # Code style, workflow, operations, decisions, domains
├── public/                      # Static assets: logo, PWA icons, web manifest
├── scripts/
│   ├── check-docs.mjs           # Docs vs code check (pre-commit and CI)
│   └── generate-icons.mjs       # Regenerates the PWA PNG icons, no dependencies
├── src/
│   ├── components/              # Svelte components; App.svelte is the root island
│   ├── layouts/Layout.astro     # HTML shell, PWA meta, no-flash theme script, background
│   ├── lib/                     # Stores and logic: auth, store, sync, supabase, tmdb, ui, format, types
│   ├── pages/index.astro        # The only page; mounts App client-only
│   └── styles/global.css        # Design tokens and glass utilities
├── supabase/schema.sql          # user_titles table and row level security, run once in Supabase
├── DESIGN.md                    # Design system (Spanish): type, color, depth, motion
├── astro.config.mjs             # Site and base for GitHub Pages, integrations
└── tailwind.config.js           # Tailwind theme mapped to the CSS tokens
```

## 3. Documentation map

Each kind of fact has exactly one home. Read the home before working in its area; update it
when the area changes.

| Home | Owns | Read it when |
|---|---|---|
| `AGENTS.md` | Global rules, doc map, doc maintenance, workflow, communication | Always (auto-loaded) |
| `docs/code-style.md` | Naming, comments, docblocks, test layout | Writing or editing any code or test |
| `docs/workflow.md` | Issue format, commit format, closing comment | Starting, committing or closing a task |
| `docs/domains/*.md` | How each feature works: data, flow, invariants, gotchas | Touching that feature (table below) |
| `docs/operations.md` | Environment variables, jobs, deploy, CI, costs | Env vars, jobs, deploy, CI, cost questions |
| `docs/decisions.md` | Why the structural choices were made (decision log) | Proposing a structural change |
| `DESIGN.md` | Design tokens, typography, color, glass, motion, components | Any visual or styling change |

**Domains** (`docs/domains/`):

| File | Covers |
|---|---|
| `auth.md` | Supabase login, build-time gate fallback, sessions |
| `catalog.md` | TMDB client, discovery rows, search, title detail data, genres |
| `library.md` | Pending and watched titles, ratings, watched dates, persistence, sync, backup |
| `ui.md` | App shell, navigation, detail view, sheets, theme, toasts |

## 4. Keeping the docs current

The docs are only useful while they match the code. Treat them as part of the change, never as
follow-up work.

**Same commit.** A change that makes a documented statement false, or adds something a doc
inventories, updates that doc in the same commit:

| When you... | Update |
|---|---|
| Add, rename or delete a file in a mapped folder | The file map that lists it (`AGENTS.md` Section 2 or a scoped `AGENTS.md`) |
| Add or change a table, field meaning, flow or invariant | The owning `docs/domains/*.md` |
| Add an env var or a scheduled job; change deploy or CI | `docs/operations.md` |
| Make a structural decision or reverse one | Append an entry to `docs/decisions.md` |
| Add a new feature area | A new `docs/domains/<area>.md` and its row in Section 3 |
| Change a rule or convention | The `AGENTS.md`, `docs/code-style.md` or `docs/workflow.md` that owns it |
| Change what the project does, its stack or how to run it | `README.md` |
| Add or change a design token, glass utility or component pattern | `DESIGN.md` |

**How to write them.**
- **One fact, one home.** Elsewhere, link to it; never copy it. Duplicates are what drift.
- **Verify before writing.** Check every claim against the code. Replace a stale statement;
  never append a second, contradictory one next to it.
- **Write what the code cannot say:** purpose, invariants, the why, cross-file flows and traps.
  Do not restate what a signature or a file name already tells.
- **Point by path and symbol, never by line number** (`orders.ts` → `createOrder`), so a
  reference survives edits.
- **Domain docs keep one template:** Purpose, Key files, Data, Flow, Invariants, Gotchas,
  Related. Keep each under ~200 lines; split by sub-area when it grows past that.
- **This file stays under ~250 lines.** Detail goes to the scoped files; only rules that apply
  to every task live here.
- English, no em dash (U+2014), same tone as the rest.

**Before calling a task done:** search the docs for every file and symbol you touched
(`rg -n "<name>" AGENTS.md docs`) and fix whatever no longer holds. Then run
`node scripts/check-docs.mjs` (also blocking in CI and in the pre-commit hook): it fails on an
em dash, a `@returns` tag, a broken relative link, a mapped file that no longer exists, a file
missing from a strict map, or a doc under `docs/` that no `AGENTS.md` mentions.

## 5. Rules for every task

- **Never hardcode secrets.** Environment variables only (`docs/operations.md`).
- **Never expose internal errors to the client.** Log the detail, return a stable error.
- **Never trust external data.** Validate every external response and user input at the
  boundary where it enters.
- **English everywhere** in code, comments, docs, issues and commits. **Never an em dash
  (U+2014)**: use a comma, colon, semicolon, period or parentheses.
- **Every exported or public function, class, hook and component carries a Google-style
  docblock** (`@return`, never `@returns`; Python: `Args:`, `Returns:`, `Raises:`). Format and
  examples in `docs/code-style.md`.
- **UI copy stays in Spanish** (`<html lang="es">`, TMDB `es-ES`); only code, comments and docs
  are English. `DESIGN.md` is Spanish prose and stays so.
- **Static site only.** No server code: everything runs in the browser, so every `PUBLIC_*`
  variable ends up in the public bundle (`docs/operations.md`).
- **Follow `DESIGN.md`** for any visual change: reuse its tokens and glass utilities before
  adding a new value. For chrome-layer glass controls (navigation, sheets, toasts, toggles),
  the `liquid-glass` skill in `.agents/skills/` applies, within the `DESIGN.md` tokens.
- **Vendored skills are not edited by hand.** `.agents/skills/` is managed by the skills CLI
  and pinned in `skills-lock.json`; the `.claude/skills/` links are local and git-ignored.

## 6. Workflow

Full formats in `docs/workflow.md`.

- **Issue first.** Before starting a task, create its GitHub issue (Context, Goal, Steps,
  Constraints, Acceptance criteria; labels `type:`, `area:`, `size:`, `priority:`). Unless the
  user says otherwise.
- **Commits:** one line, Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`,
  `chore:` ...), English, no body, no `Co-Authored-By` trailer or any other attribution. Docs
  updated in the same commit.
- **Close the loop.** After committing, comment on the issue in English: the commit sha, what
  changed and why. Close it if complete; otherwise list what is still missing.
- **Gate before calling a task done:** `pnpm check` and `pnpm build`, and
  `node scripts/check-docs.mjs`.
- **Agents commit, the user pushes. Never run git push.**

## 7. Communication style

Respond concisely. No filler, no pleasantries, no hedging ("it might be worth considering").
Code, technical terms and error messages exact. Git commits, issues and PRs are written
normally (formats in `docs/workflow.md`).

### Decision analysis

Before answering any question about a task or a decision, or before taking one, analyse it
first. Read the code, the issue and any external source involved. Then answer with this
structure, short:

- **Value:** what it adds to the system and to the user.
- **Effort:** what it takes to build (size, files, risk).
- **Costs:** money, infrastructure usage, storage, maintenance. Say "none" when there are none.
- **Source:** where the data or information comes from (only when relevant).
- **Verdict:** whether it is worth it, and whether you would do it or not, with the reason.

Never recommend or decide without that analysis behind it.
