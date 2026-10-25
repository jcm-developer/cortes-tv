# Catalog

## Purpose

Everything that comes from TheMovieDB: the discovery rows on Home, search, the title detail
(genres, runtime, seasons, cast, where to watch, similar titles) and the genre names used by
the library filters.
TMDB is called straight from the browser with a read-only key.

## Key files

- `src/lib/tmdb.ts` (`tmdbFetch`, `mapSummary`, `searchMulti`, `trending`, `fetchList` and the
  row loaders, `getDetail`, `recommendationsFor`, `getGenreMap`, `img`, `ImageSize`,
  `TmdbError`): the client.
- `src/lib/types.ts` (`MediaSummary`, `MediaDetail`, `CastMember`, `WatchProviders`): the app
  shapes the client maps into.
- `src/components/Home.svelte`: the list of discovery rows (title plus loader).
- `src/components/DiscoverRow.svelte`: loads one row and renders it as a carousel.
- `src/components/Search.svelte`: debounced multi search.
- `src/components/Detail.svelte`: loads and shows `getDetail`.

## Data

- `localStorage["cortes-tv:genres"]`: the merged movie and TV genre map, id to name. Cached in
  memory and in storage with no expiry.
- Images are URLs built by `img(path, size)`; `ImageSize` holds the TMDB size names chosen to
  keep mobile downloads small.

## Flow

1. A caller runs a loader with an `AbortSignal`; `tmdbFetch` adds `api_key` and `language`.
2. Network failures and HTTP errors become a `TmdbError` with a Spanish message for the UI
   (401 bad key, 404, 429 rate limit, other status). `AbortError` is rethrown untouched so
   callers can ignore cancelled requests.
3. Raw TMDB objects (`RawMedia`, `RawDetail`) are mapped to `MediaSummary` or `MediaDetail` in
   `mapSummary` and `getDetail`. Search drops people (`media_type` not movie or tv); list rows
   drop items without a poster.
4. `getDetail` asks for `credits` and `watch/providers` in the same request and keeps the
   first 18 cast members. `Detail.svelte` loads `recommendationsFor` in parallel for its
   "Si te gusta esto" row.

## Invariants

- Snake case TMDB fields never leave `tmdb.ts`; the rest of the app sees camelCase types.
- Every call aborts cleanly: components keep an `AbortController` and abort it on change or
  unmount.

## Gotchas

- `hasApiKey()` treats the `.env.example` placeholder (`tu_api_key_de_tmdb`) as missing; Home
  and Search show a setup hint instead of calling TMDB.
- Watch providers use `PUBLIC_TMDB_REGION`, then fall back to `US`, then to the first region
  TMDB returns.
- The genre cache never refreshes; clear `cortes-tv:genres` after changing
  `PUBLIC_TMDB_LANG`.

## Related

- `docs/domains/library.md`: stored titles are snapshots of `MediaSummary`.
- `docs/operations.md`: the TMDB variables.
