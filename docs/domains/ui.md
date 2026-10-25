# UI

## Purpose

The app shell around the features: the top bar, the phone tab bar, the tab headers, the
in-memory tabs, the full-screen detail view, sheets, the light, dark and system theme, and
toasts. Phones (below 768px) and desktop share the views but not the navigation. Visual rules live in `DESIGN.md`; this doc covers
behaviour.

## Key files

- `src/lib/ui.ts` (`activeTab`, `selectTab`, `librarySegment`, `openLibrary`, `settingsOpen`,
  `detailTarget`, `openDetail`, `closeDetail`, `onHistoryBack`, `titleSheetTarget`,
  `openTitleSheet`, `closeTitleSheet`, `theme`, `darkActive`, `toggleTheme`, `applyTheme`,
  `toast`, `showToast`,
  `hideToast`): ephemeral UI state, never persisted except the theme.
- `src/components/App.svelte`: root island; auth gate, tab switch, overlays, scroll lock,
  `popstate`.
- `src/components/TopBar.svelte`: the floating glass top bar: wordmark (goes home), the tabs on
  desktop, the theme toggle and the settings button.
- `src/components/TabBar.svelte`: the floating glass tab bar (Inicio, Buscar, Biblioteca), phones
  only.
- `src/components/PageHeader.svelte`: the large title and subtitle of Search and Library.
- `src/components/Detail.svelte`, `Sheet.svelte`, `TitleSheet.svelte`, `Toast.svelte`.
- Building blocks: `Logo.svelte`, `Carousel.svelte`, `PosterCard.svelte`,
  `StarRating.svelte`, `MissingKey.svelte`, `Icon.svelte`.
- `src/layouts/Layout.astro`: PWA meta, the no-flash theme script, the service worker
  registration, the atmospheric background.
- `src/styles/global.css` (tokens, content layer) and `src/styles/glass.css` (the Liquid
  Glass chrome layer ported from the `liquid-glass` skill).
- `public/sw.js`, `public/manifest.webmanifest`: offline support and install metadata.

## Data

- `localStorage["cortes-tv:theme"]`: `light`, `dark` or `system` (default).

## Flow

1. `Layout.astro` applies the `dark` class before first paint from the stored theme.
2. `theme.subscribe` applies and stores every change; `App.svelte` also re-applies it when the
   system scheme changes.
3. `openDetail` pushes one history entry on the first open, so the browser back button and the
   iOS back gesture (`popstate` → `onHistoryBack`) close the detail. Opening another title from
   inside the detail swaps the target without a new entry. `closeDetail` pops that entry with
   `history.back()`.
4. `showToast` shows one message for 2.2 s, or 4 s when it carries an action ("Deshacer"); a
   new toast replaces the current one.
5. `selectTab` switches tabs from both bars; pressing the active tab again scrolls to the top.
6. The top bar is clear while the page is at the top and turns to glass as soon as it scrolls
   (`is-clear`). Its theme button (`toggleTheme`) switches to the scheme not on screen
   (`darkActive`) as an explicit `light` or `dark`; `system` is chosen in Settings.
7. `Sheet.svelte` slides up attached to the bottom edge on phones; dragging its grabber or
   heading down more than 120px (or flicking it) closes it. On desktop it is a centred card.
   Both animate out, so a sheet whose content depends on a store (`TitleSheet.svelte`) keeps
   rendering the last target while it leaves.
8. While the detail view or a sheet is open, `App.svelte` puts `is-locked` on `<html>`
   (`overflow: hidden`), so iOS does not scroll the page behind the overlay.
9. In production, `Layout.astro` registers `public/sw.js` under the base path. It serves pages
   network first with the cached shell as fallback, hashed `/assets/` cache first, TMDB images
   cache first (400 entries) and TMDB API answers network first with the last answer as
   fallback (80 entries), so the installed app opens offline with the library and the last
   rows. Convex traffic (a WebSocket and auth calls) is never cached.

## Invariants

- Tabs are state, not routes: there is one URL (`docs/decisions.md`, D2).
- The top bar floats on every screen size and `main` leaves `--topbar-room` for it. The tab bar
  floats at the bottom on phones only, with the same width as the top bar (`--chrome-w`);
  `main` leaves `--tabbar-room` and the toast sits at `--toast-bottom`, both smaller on desktop.
  The top bar spans the content column on desktop (`max-w-5xl`). Overlays sit above both bars
  in z-order: detail (120), sheets (150), toast (200).
- The detail view is always dark (it carries the `dark` class), whatever the theme.
- `glass.css` is imported between Tailwind's components and utilities (`global.css`), so a
  utility such as `fixed` or `hidden` still overrides a glass component.
- No native dialogs (`confirm`, `alert`): confirmations are inline, as in Settings' log out.

## Gotchas

- The theme script in `Layout.astro` duplicates the logic of `applyTheme`; change both.
- The service worker only runs in production builds (`pnpm build && pnpm preview` to try it).
  Bump `VERSION` in `sw.js` to drop every cache; a new deploy is picked up anyway on the next
  open, because pages are network first.
- The logo exists twice: `public/icons/icon.svg` (the app icon, source of every PNG through
  `scripts/generate-icons.mjs`) and `src/components/Logo.svelte` (the wordmark on the login
  and splash; the top bar shows "Cortes TV" as text). Both use the same path, "Ctv" set in SF Pro Display Bold and converted to
  outlines; change both together.
- A glass element is the containing block of its `position: fixed` children; keep menus and
  tooltips outside glass containers. iOS keeps the icon of an installed app until it is
  removed and added again to the home screen.

## Related

- `DESIGN.md`: tokens, glass, motion and component patterns.
- `docs/domains/auth.md`: the gate rendered by `App.svelte`.
