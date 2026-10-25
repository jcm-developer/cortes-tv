# Library

## Purpose

The user's own data: the titles they track, each one either pending (to watch) or watched,
with a personal 1 to 5 rating and a watched date on watched titles. It persists in
`localStorage` and can be exported and imported as JSON for backups and to move between
devices.

## Key files

- `src/lib/store.ts` (`appData`, `pendingTitles`, `watchedTitles`, `setStatus`, `removeTitle`,
  `restoreTitle`, `setRating`, `setWatchedAt`, `replaceTitles`, `onLocalChange`, `cleanTitle`,
  `normalize`, `exportJSON`, `importJSON`): state and every mutation.
- `src/lib/types.ts` (`AppData`, `StoredTitle`, `TitleStatus`): the persisted schema.
- `src/components/Library.svelte`: Pending and Watched segments with text search, type, genre
  and sort filters.
- `src/components/TitleSheet.svelte`: status, rating, watched date and remove, from any poster.
- `src/components/Detail.svelte`: the same actions inline in the title detail.
- `src/components/Settings.svelte`: export and import (merge or replace).

## Data

`localStorage["cortes-tv:data"]` holds one `AppData` document:

- `version`: the schema version (`SCHEMA_VERSION`, currently 2).
- `titles`: `StoredTitle` objects keyed by `mediaType:id` (`movie:123`, `tv:456`). A title is a
  snapshot of the TMDB summary at add time plus `status`, `addedAt`, `updatedAt`, `rating` and
  `watchedAt`.

## Flow

1. `appData` loads once from storage through `normalize`; a missing or broken document becomes
   empty data.
2. Mutations go through `mutate` in `store.ts`, which copies the titles, applies the change and
   tells the `onLocalChange` listeners which keys changed.
3. A subscription writes the document back to storage, debounced by 150 ms.
4. `importJSON` runs the incoming text through `normalize`; `replace` swaps the data, `merge`
   keeps the most recently changed version of each title (`updatedAt`).

## Invariants

- Only watched titles have a rating or a watched date. `setStatus` to pending clears both;
  `setRating` and `setWatchedAt` ignore titles that are not watched; `cleanTitle` drops them on
  load.
- Marking a title watched sets today (local date, `todayDate`) as its watched date when it has
  none.
- Every title that enters the app (storage, import, server) goes through `cleanTitle`, which
  rejects an invalid media type or id and coerces every other field.
- `updatedAt` changes on every mutation; it decides merges and sync conflicts.

## Gotchas

- Schema v1 had user lists (`lists[].itemKeys`). `normalize` migrates any document that still
  has `lists`: a title becomes watched when it has a rating or a watched date or sits in a list
  named like "Vistas" (`WATCHED_LIST_NAME`); every other listed title becomes pending; titles
  in no list are dropped. Old backups import the same way.
- Removing a title deletes its rating and date; the toast offers "Deshacer" (`restoreTitle`).
- Storage write errors (quota) are swallowed silently; export regularly.

## Related

- `docs/decisions.md`, D6: why two statuses replaced user lists.
- `docs/domains/catalog.md`: where the snapshots come from.
