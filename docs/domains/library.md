# Library

## Purpose

The user's own data: the titles they track, each one either pending (to watch) or watched,
with a personal 1 to 5 rating and a watched date on watched titles. It persists in
`localStorage`, syncs with Supabase when it is configured, and can be exported and imported as
JSON for backups.

## Key files

- `src/lib/store.ts` (`appData`, `pendingTitles`, `watchedTitles`, `setStatus`, `removeTitle`,
  `restoreTitle`, `setRating`, `setWatchedAt`, `replaceTitles`, `onLocalChange`, `cleanTitle`,
  `normalize`, `exportJSON`, `importJSON`): state and every mutation.
- `src/lib/types.ts` (`AppData`, `StoredTitle`, `TitleStatus`): the persisted schema.
- `src/lib/sync.ts` (`syncState`, `syncNow`, `signOut`, `flush`, `pull`, `adopt`, `forget`):
  cloud sync.
- `supabase/schema.sql`: the `user_titles` table and its row level security.
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

With Supabase, `user_titles` holds one row per title and user, primary key
`(user_id, key)`, with the same fields in snake case. Check constraints mirror the invariants
below. Sync bookkeeping in `localStorage`: `cortes-tv:dirty` (keys changed locally and not yet
sent) and `cortes-tv:owner` (the user id the local library belongs to).

## Flow

1. `appData` loads once from storage through `normalize`; a missing or broken document becomes
   empty data.
2. Mutations go through `mutate` in `store.ts`, which copies the titles, applies the change and
   tells the `onLocalChange` listeners which keys changed.
3. A subscription writes the document back to storage, debounced by 150 ms.
4. `importJSON` runs the incoming text through `normalize`; `replace` swaps the data, `merge`
   keeps the most recently changed version of each title (`updatedAt`).

Sync (only with Supabase and a signed-in user):

1. `onLocalChange` marks the changed keys dirty and schedules a `flush` 800 ms later.
2. `flush` upserts the dirty keys that exist locally and deletes the rest, in chunks of 200;
   keys changed again while the request was in flight stay dirty. A failure retries with a
   delay that doubles from 5 s up to 5 min.
3. `pull` reads every row of the user and replaces the local library, keeping the local
   version of dirty keys. If a flush finished while the rows were downloading, it starts over
   (`flushGeneration`). It runs after sign-in, when the connection returns and when the app
   comes back to the foreground (at most every 30 s); "sync now" in Settings runs both.
4. On sign-in, `adopt` compares `cortes-tv:owner` with the user: the same user continues; data
   of another user is dropped; data with no owner (created before any login) is merged into the
   account on the next pull, uploading titles the account lacks or holds older.
5. Only an explicit sign-out (`signOut`) runs `forget`, which clears the local library and the
   bookkeeping. A session that ends by itself (expired refresh token, paused project) keeps
   everything; the login shows, and the same user signing in again resumes the sync.
6. `flush` and `pull` first check that the client holds a session for the expected user
   (`hasSession`): without one, RLS answers an empty list instead of an error, which a pull
   would apply as an empty account.

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
- Conflicts are last write wins per title: a dirty local title overwrites the server row on
  flush. Signing out with dirty keys loses them; Settings asks first.
- A pull replaces the library without notifying `onLocalChange`, so server data is never sent
  back as a local change. `replaceTitles` writes storage at once (no debounce), so a closed tab
  never keeps a signed-out user's titles.
- Two open tabs each keep their own dirty set and overwrite each other's storage; use one tab
  (the installed app is one).

## Related

- `docs/decisions.md`, D6: why two statuses replaced user lists; D7: why Supabase.
- `docs/domains/auth.md`: the session that sync needs.
- `docs/domains/catalog.md`: where the snapshots come from.
