# UI

## Purpose

The app shell around the features: the top navigation with its mobile drawer, the in-memory
tabs, the full-screen detail view, bottom sheets, the light, dark and system theme, and
toasts. Visual rules live in `DESIGN.md`; this doc covers behaviour.

## Key files

- `src/lib/ui.ts` (`activeTab`, `settingsOpen`, `detailTarget`, `openDetail`, `closeDetail`,
  `addSheetTarget`, `openAddSheet`, `closeAddSheet`, `theme`, `applyTheme`, `toggleTheme`,
  `toast`, `showToast`): ephemeral UI state, never persisted except the theme.
- `src/components/App.svelte`: root island; auth gate, tab switch, overlays, history handling.
- `src/components/TopNav.svelte`: desktop links, mobile drawer, theme toggle, settings.
- `src/components/Detail.svelte`, `Sheet.svelte`, `AddToListSheet.svelte`, `Toast.svelte`.
- Building blocks: `Carousel.svelte`, `PosterCard.svelte`, `Select.svelte`,
  `StarRating.svelte`, `Icon.svelte`.
- `src/layouts/Layout.astro`: PWA meta, the no-flash theme script, the blurred background.

## Data

- `localStorage["cortes-tv:theme"]`: `light`, `dark` or `system` (default).

## Flow

1. `Layout.astro` applies the `dark` class before first paint from the stored theme.
2. `theme.subscribe` applies and stores every change; `App.svelte` also re-applies it when the
   system scheme changes.
3. `openDetail` sets `detailTarget`; `App.svelte` pushes one history entry so the browser back
   button (`popstate`) closes the detail.
4. `showToast` shows one message for 2.2 s; a new toast replaces the current one.

## Invariants

- Tabs are state, not routes: there is one URL (`docs/decisions.md`, D2).
- `Select.svelte` positions its menu as `fixed` so scroll containers do not clip it, and
  closes it on any scroll.

## Gotchas

- Closing the detail with its own button does not pop the history entry it pushed; the next
  back press fires `popstate` with the detail already closed.
- The theme script in `Layout.astro` duplicates the logic of `applyTheme`; change both.

## Related

- `DESIGN.md`: tokens, glass, motion and component patterns.
- `docs/domains/auth.md`: the gate rendered by `App.svelte`.
