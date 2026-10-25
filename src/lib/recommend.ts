/**
 * Personal recommendations, computed in the browser from the watched titles.
 *
 * TMDB's per-title recommendations of the best rated watched titles ("seeds") are pooled and
 * scored by how much the user liked each seed, the user's genre affinity (learned from their
 * ratings) and the TMDB score. See `docs/domains/recommendations.md`.
 */
import { recommendationsFor } from './tmdb';
import type { MediaSummary, StoredTitle } from './types';

/** Seeds queried per computation; one TMDB request each. */
const MAX_SEEDS = 8;
/** Recommendations returned. */
const MAX_RESULTS = 20;

/** A recommended title and why it is there. */
export interface Recommendation {
  item: MediaSummary;
  /** Short Spanish reason, such as "Porque te gustó Dune" or "Porque viste Dune". */
  reason: string;
  score: number;
}

/**
 * Returns how much a watched title says about the user's taste, from its rating.
 *
 * @param rating - The personal rating, or null when unrated.
 * @return A weight from 0 (disliked) to 1 (loved); unrated titles count a little.
 */
function seedWeight(rating: number | null): number {
  if (rating === null) return 0.3;
  return [0, 0, 0.1, 0.35, 0.7, 1][rating] ?? 0;
}

/**
 * Builds the user's affinity per genre from the watched titles.
 *
 * Each rating maps to -1 (1 star) to +1 (5 stars), unrated titles to a small positive value.
 * The sum per genre is shrunk towards 0 by two virtual neutral titles, so one rating does not
 * dominate a genre.
 *
 * @param watched - The watched titles.
 * @return The affinity by genre id, roughly between -1 and 1.
 */
export function genreAffinity(watched: StoredTitle[]): Map<number, number> {
  const sum = new Map<number, number>();
  const count = new Map<number, number>();
  for (const t of watched) {
    const w = t.rating === null ? 0.15 : (t.rating - 3) / 2;
    for (const g of t.genreIds) {
      sum.set(g, (sum.get(g) ?? 0) + w);
      count.set(g, (count.get(g) ?? 0) + 1);
    }
  }
  const out = new Map<number, number>();
  for (const [g, s] of sum) out.set(g, s / ((count.get(g) ?? 0) + 2));
  return out;
}

/**
 * Picks the watched titles whose TMDB recommendations are worth fetching.
 *
 * Titles rated 4 or 5 come first (best rated, then most recently watched). With fewer than
 * three of them, recent titles rated 3 or unrated fill the list; titles rated 1 or 2 are never
 * seeds.
 *
 * @param watched - The watched titles.
 * @return Up to `MAX_SEEDS` seeds.
 */
export function pickSeeds(watched: StoredTitle[]): StoredTitle[] {
  const byRecent = (a: StoredTitle, b: StoredTitle) =>
    (b.watchedAt ?? '').localeCompare(a.watchedAt ?? '') || b.updatedAt.localeCompare(a.updatedAt);
  const loved = watched
    .filter((t) => (t.rating ?? 0) >= 4)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || byRecent(a, b));
  if (loved.length >= 3) return loved.slice(0, MAX_SEEDS);
  const fill = watched.filter((t) => t.rating === null || t.rating === 3).sort(byRecent);
  return [...loved, ...fill].slice(0, MAX_SEEDS);
}

/** Returns a stable signature of the inputs, so an unchanged library reuses the last result. */
function signature(seeds: StoredTitle[], watched: StoredTitle[]): string {
  return `${seeds.map((s) => `${s.key}=${s.rating}`).join(',')}|${watched.length}`;
}

let cache: { sig: string; result: Recommendation[] } | null = null;

/**
 * Computes recommendations for the user.
 *
 * Candidates already in the library are left out. A seed whose request fails is skipped; the
 * others still count.
 *
 * @param titles - Every title in the library, pending and watched.
 * @param signal - Aborts the TMDB requests.
 * @return Up to 20 recommendations, best first; empty when there is nothing watched to learn from.
 */
export async function recommend(
  titles: StoredTitle[],
  signal?: AbortSignal,
): Promise<Recommendation[]> {
  const watched = titles.filter((t) => t.status === 'watched');
  const seeds = pickSeeds(watched);
  if (seeds.length === 0) return [];

  const sig = signature(seeds, watched);
  const inLibrary = new Set(titles.map((t) => t.key));
  if (cache?.sig === sig) return cache.result.filter((r) => !inLibrary.has(key(r.item)));

  const lists = await Promise.all(
    seeds.map((s) =>
      recommendationsFor(s.mediaType, s.id, signal).catch((err) => {
        if ((err as Error)?.name === 'AbortError') throw err;
        return [] as MediaSummary[];
      }),
    ),
  );

  const affinity = genreAffinity(watched);
  const pool = new Map<string, { item: MediaSummary; votes: number; best: number; from: StoredTitle }>();
  lists.forEach((list, si) => {
    const seed = seeds[si];
    const weight = seedWeight(seed.rating);
    list.slice(0, 20).forEach((item, rank) => {
      const k = key(item);
      if (inLibrary.has(k)) return;
      const vote = weight * (1 - rank / 25);
      const entry = pool.get(k);
      if (!entry) pool.set(k, { item, votes: vote, best: vote, from: seed });
      else {
        entry.votes += vote;
        if (vote > entry.best) Object.assign(entry, { best: vote, from: seed });
      }
    });
  });

  const result: Recommendation[] = [...pool.values()]
    .map(({ item, votes, from }) => {
      const genres = item.genreIds.map((g) => affinity.get(g) ?? 0);
      const genreScore = genres.length ? genres.reduce((a, b) => a + b, 0) / genres.length : 0;
      const quality =
        item.voteAverage && item.voteAverage > 0
          ? Math.max(-0.3, Math.min(0.45, (item.voteAverage - 6.5) * 0.15))
          : -0.1;
      return {
        item,
        reason: `${(from.rating ?? 0) >= 4 ? 'Porque te gustó' : 'Porque viste'} ${from.title}`,
        score: votes + genreScore * 0.8 + quality,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS);

  cache = { sig, result };
  return result;
}

/** Returns the library key of a summary. */
function key(item: MediaSummary): string {
  return `${item.mediaType}:${item.id}`;
}
