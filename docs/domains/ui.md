# UI

## Purpose

The app shell around the features: the top bar, the mobile bottom tab bar, the in-memory
tabs, the full-screen detail view, bottom sheets, the light, dark and system theme, and
toasts. Visual rules live in `DESIGN.md`; this doc covers behaviour.

## Key files

- `src/lib/ui.ts` (`activeTab`, `librarySegment`, `openLibrary`, `settingsOpen`,
  `detailTarget`, `openDetail`, `closeDetail`, `onHistoryBack`, `titleSheetTarget`,
  `openTitleSheet`, `closeTitleSheet`, `theme`, `applyTheme`, `toggleTheme`, `toast`,
  `showToast`, `hideToast`): ephemeral UI state, never persisted except the theme.
- `src/components/App.svelte`: root island; auth gate, tab switch, overlays, `popstate`.
- `src/components/TopNav.svelte`: top bar (links, theme and settings on desktop; brand and
  settings on mobile) and the mobile bottom tab bar.
- `src/components/Detail.svelte`, `Sheet.svelte`, `TitleSheet.svelte`, `Toast.svelte`.
- Building blocks: `Carousel.svelte`, `PosterCard.svelte`, `Select.svelte`,
  `StarRating.svelte`, `Icon.svelte`.
- `src/layouts/Layout.astro`: PWA meta, the no-flash theme script, the blurred background.

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
5. Pressing the active tab again scrolls to the top.

## Invariants

- Tabs are state, not routes: there is one URL (`docs/decisions.md`, D2).
- The mobile tab bar is fixed at the bottom; `main` and the toast leave room for it below the
  `sm` breakpoint, and overlays (detail, sheets) sit above it in z-order.
- `Select.svelte` positions its menu as `fixed` so scroll containers do not clip it, and
  closes it on any scroll.

## Gotchas

- The theme script in `Layout.astro` duplicates the logic of `applyTheme`; change both.

## Related

- `DESIGN.md`: tokens, glass, motion and component patterns.
- `docs/domains/auth.md`: the gate rendered by `App.svelte`.
