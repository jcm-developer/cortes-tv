# Recommendations

## Purpose

The "Para ti" row on Home: titles the user has not saved yet, picked from what they watched
and how they rated it. Computed in the browser from TMDB data; no server, no AI service.

## Key files

- `src/lib/recommend.ts` (`recommend`, `pickSeeds`, `genreAffinity`, `Recommendation`): the
  scoring.
- `src/lib/tmdb.ts` (`recommendationsFor`): TMDB's recommendations for one title.
- `src/components/ForYouRow.svelte`: the row, its loading state and the hint shown before
  anything is watched.

## Data

Nothing is stored. The last result lives in memory in `recommend.ts` (`cache`), keyed by a
signature of the seeds, their ratings and the number of watched titles.

## Flow

1. `pickSeeds`: watched titles rated 4 or 5, best rated then most recently watched, up to 8.
   With fewer than 3 of them, recent titles rated 3 or unrated fill the list. Titles rated 1
   or 2 are never seeds.
2. One `recommendationsFor` request per seed, in parallel; a failed seed is skipped.
3. Each candidate collects a vote from every seed that recommends it: the seed weight (5 stars
   1.0, 4 stars 0.7, 3 stars 0.35, unrated 0.3) times its rank in that list (1 at the top,
   falling by 1/25 per place).
4. `genreAffinity` maps every watched rating to -1 (1 star) through +1 (5 stars), unrated to
   +0.15, averaged per genre with two virtual neutral titles so one rating cannot dominate.
5. Score = votes + 0.8 × mean affinity of the candidate's genres + a TMDB quality term
   ((vote − 6.5) × 0.15, clamped to −0.3..0.45; −0.1 with no votes). The best 20 are returned
   with the reason of the strongest seed ("Porque te gustó X" for 4 or 5 stars, "Porque viste
   X" otherwise).

## Invariants

- Titles already in the library (pending or watched) are never recommended; titles saved after
  the computation leave the row at once (`ForYouRow.svelte`, `visible`).
- At most 8 TMDB requests per computation, and none while the signature is unchanged.

## Gotchas

- `ForYouRow.svelte` reruns only when the watched titles or their ratings change
  (`watchedSig`); it reads the rest with `untrack`, because tracking its own `items` would loop.
- The weights are hand-tuned constants in `recommend.ts`; change them there and in this doc.

## Related

- `docs/domains/library.md`: statuses and ratings, the input.
- `docs/domains/catalog.md`: the TMDB client.
