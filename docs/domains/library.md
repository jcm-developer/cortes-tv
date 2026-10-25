# Library

## Purpose

The user's own data: the titles they track, each one either pending (to watch) or watched,
with a personal 1 to 5 rating and a watched date on watched titles. It persists in
`localStorage`, syncs live with Convex when it is configured, and can be exported and imported as
JSON for backups.

## Key files

- `src/lib/store.ts` (`appData`, `pendingTitles`, `watchedTitles`, `setStatus`, `removeTitle`,
  `restoreTitle`, `setRating`, `setWatchedAt`, `replaceTitles`, `onLocalChange`, `cleanTitle`,
  `normalize`, `exportJSON`, `importJSON`): state and every mutation.
- `src/lib/types.ts` (`AppData`, `StoredTitle`, `TitleStatus`): the persisted schema.
- `src/lib/sync.ts` (`syncState`, `syncNow`, `signOut`, `flush`, `apply`, `subscribe`,
  `adopt`, `forget`): cloud sync.
- `convex/schema.ts` (`titleFields`) and `convex/titles.ts` (`list`, `upsertMany`,
  `removeMany`): the server table and the only functions that touch it.
- `src/components/Library.svelte`: Pending and Watched segments with text search, type, genre
  and sort filters.
- `src/components/TitleSheet.svelte`: status, rating and remove, from any poster.
- `src/components/Detail.svelte`: the same actions inline in the title detail.
- `src/components/Settings.svelte`: export and import (merge or replace).

## Data

`localStorage["cortes-tv:data"]` holds one `AppData` document:

- `version`: the schema version (`SCHEMA_VERSION`, currently 2).
- `titles`: `StoredTitle` objects keyed by `mediaType:id` (`movie:123`, `tv:456`). A title is a
  snapshot of the TMDB summary at add time plus `status`, `addedAt`, `updatedAt`, `rating` and
  `watchedAt`.

With Convex, the `titles` table holds one row per title and user (`userId` plus the same
fields, `tmdbId` for `id`), indexed by `by_user_key`. `upsertMany` re-applies the invariants
below and checks that `key` is `mediaType:tmdbId`. Sync bookkeeping in `localStorage`: `cortes-tv:dirty` (keys changed locally and not yet
sent) and `cortes-tv:owner` (the user id the local library belongs to).

## Flow

1. `appData` loads once from storage through `normalize`; a missing or broken document becomes
   empty data.
2. Mutations go through `mutate` in `store.ts`, which copies the titles, applies the change and
   tells the `onLocalChange` listeners which keys changed.
3. A subscription writes the document back to storage, debounced by 150 ms.
4. `importJSON` runs the incoming text through `normalize`; `replace` swaps the data, `merge`
   keeps the most recently changed version of each title (`updatedAt`).

Sync (only with Convex and a signed-in user):

1. `onLocalChange` marks the changed keys dirty and schedules a `flush` 800 ms later.
2. `flush` calls `upsertMany` for the dirty keys that exist locally and `removeMany` for the
   rest, in chunks of 200; keys changed again while the request was in flight stay dirty.
   Offline, the Convex client holds the mutations until it reconnects; a failure retries with
   a delay that doubles from 5 s up to 5 min.
3. `subscribe` keeps a live `titles.list` subscription; `apply` replaces the local library
   with each server state, keeping the local version of dirty keys. Another device's change
   shows within a second.
4. On the server, `upsertMany` keeps a row whose `updatedAt` is newer than the incoming one,
   so an outdated device never overwrites a newer change.
5. On sign-in, `adopt` compares `cortes-tv:owner` with the user: the same user continues; data
   of another user is dropped; data with no owner (created before any login) is merged into the
   account on the first server state, uploading titles the account lacks or holds older.
6. Only an explicit sign-out (`signOut`) runs `forget`, which clears the local library and the
   bookkeeping. A session that ends by itself keeps everything; the login shows, and the same
   user signing in again resumes the sync.

## Invariants

- Only watched titles have a rating or a watched date. `setStatus` to pending clears both;
  `setRating` and `setWatchedAt` ignore titles that are not watched; `cleanTitle` drops them on
  load.
- Marking a title watched sets today (local date, `todayDate`) as its watched date when it has
  none. The date is internal: the UI never shows or edits it (the user does not track when a
  title was watched); it only orders "Vistas recientemente" and the recommendation seeds.
  `setWatchedAt` stays for imports and future use.
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
- Conflicts are last write wins per title, by `updatedAt` (device clocks). Deletes always win.
  Signing out with dirty keys loses them; Settings asks first.
- `titles.list` answers null without a session; `apply` ignores it, so a lost session never
  reads as an empty account. Convex resolves a mutation only after subscriptions include it, so
  a key leaves the dirty set no earlier than the server state that holds it.
- A pull replaces the library without notifying `onLocalChange`, so server data is never sent
  back as a local change. `replaceTitles` writes storage at once (no debounce), so a closed tab
  never keeps a signed-out user's titles.
- Two open tabs each keep their own dirty set and overwrite each other's storage; use one tab
  (the installed app is one).

## Related

- `docs/decisions.md`, D6: why two statuses replaced user lists; D8: why Convex.
- `docs/domains/auth.md`: the session that sync needs.
- `docs/domains/catalog.md`: where the snapshots come from.
