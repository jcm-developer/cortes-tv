# Library

## Purpose

The user's own data: lists they create, the titles in them, a personal 1 to 5 rating and a
watched date per title. It persists in `localStorage` and can be exported and imported as
JSON for backups and to move between devices.

## Key files

- `src/lib/store.ts` (`appData`, `lists`, `listCounts`, `addToList`, `removeFromList`,
  `moveToList`, `toggleInList`, `setRating`, `setWatchedAt`, `createList`, `renameList`,
  `deleteList`, `exportJSON`, `importJSON`, `normalize`): state and every mutation.
- `src/lib/types.ts` (`AppData`, `StoredTitle`, `MovieList`): the persisted schema.
- `src/components/Lists.svelte`: list index, list view with type, genre and sort filters,
  per-title move and remove, rename and delete.
- `src/components/AddToListSheet.svelte`: toggles a title in each list, creates a list inline.
- `src/components/Detail.svelte`: rating and watched date of a stored title.
- `src/components/Settings.svelte`: export and import (replace or merge).

## Data

`localStorage["cortes-tv:data"]` holds one `AppData` document:

- `version`: the schema version (`SCHEMA_VERSION`, currently 1).
- `titles`: `StoredTitle` snapshots keyed by `mediaType:id` (`movie:123`, `tv:456`). A
  snapshot copies the summary fields at add time plus `addedAt`, `rating` and `watchedAt`.
- `lists`: `MovieList[]`; `itemKeys` is the ordered join table to `titles`, newest first.

## Flow

1. `appData` loads once from storage through `normalize`; a missing or broken document becomes
   empty data.
2. Mutations go through the functions in `store.ts`, which always return a new `AppData`
   object so Svelte subscribers update.
3. A subscription writes the document back to storage, debounced by 150 ms.
4. `importJSON` runs the incoming text through `normalize`; `replace` swaps the data, `merge`
   adds titles and joins lists by id, then by name.

## Invariants

- A title exists in `titles` only while at least one list references it: `removeFromList` and
  `deleteList` drop orphans, `normalize` drops `itemKeys` that point to missing titles.
- There are no default lists; the user creates every list.
- Rating and watched date need a stored title: `Detail.svelte` asks the user to add the title
  to a list first.

## Gotchas

- `MovieList.predefined` is always `false`: `normalize` and `createList` force it. The checks
  that protect predefined lists from rename and delete are dormant.
- `recentlyAdded` is exported but no component uses it.
- Removing a title from its last list deletes its snapshot, and with it the rating and the
  watched date; moving it keeps them.
- Storage write errors (quota) are swallowed silently; export regularly.
- A merge import keeps the incoming list id only when no list matches by id or name.

## Related

- `docs/decisions.md`, D3: why the data is normalized.
- `docs/domains/catalog.md`: where the snapshots come from.
