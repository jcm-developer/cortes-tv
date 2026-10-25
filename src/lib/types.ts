/**
 * Domain types.
 *
 * The persisted shape is ready for an external database (for example Supabase): `titles` is a
 * normalized table and `lists[].itemKeys` is the many-to-many join table between lists and
 * titles. See `docs/decisions.md`, D3.
 */

/** The two kinds of title TMDB serves that the app handles. */
export type MediaType = 'movie' | 'tv';

/** A light title, as shown in search results and carousels. */
export interface MediaSummary {
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  year: string | null;
  voteAverage: number | null;
  genreIds: number[];
  overview?: string;
}

/** A title as stored locally: a snapshot of its summary plus the user's own data. */
export interface StoredTitle {
  /** Stable unique key: `${mediaType}:${id}`. */
  key: string;
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  year: string | null;
  voteAverage: number | null;
  genreIds: number[];
  /** When it was first stored (ISO 8601). */
  addedAt: string;
  /** Personal rating from 1 to 5, or null when unrated. */
  rating: number | null;
  /** Watched date (YYYY-MM-DD), or null. */
  watchedAt: string | null;
}

/**
 * A user list.
 *
 * `predefined` lists cannot be renamed or deleted, but `normalize` in `store.ts` sets it to
 * false on every list, so none exist today.
 */
export interface MovieList {
  id: string;
  name: string;
  predefined: boolean;
  createdAt: string;
  /** Title keys in order, most recently added first. */
  itemKeys: string[];
}

/** The whole persisted document; `version` allows schema migrations. */
export interface AppData {
  version: number;
  titles: Record<string, StoredTitle>;
  lists: MovieList[];
}

// --- Detail (immersive view) ------------------------------------------------

/** An actor in a title's cast. */
export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

/** A streaming, rental or purchase service. */
export interface WatchProvider {
  providerId: number;
  providerName: string;
  logoPath: string | null;
}

/** Where to watch a title in one region, grouped by subscription, rent and buy. */
export interface WatchProviders {
  link: string | null;
  flatrate: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
}

/** The full detail of a title, for the detail view. */
export interface MediaDetail extends MediaSummary {
  genres: { id: number; name: string }[];
  /** Runtime in minutes (movies only). */
  runtime: number | null;
  /** Number of seasons (TV shows only). */
  seasons: number | null;
  episodes: number | null;
  tagline: string | null;
  cast: CastMember[];
  providers: WatchProviders | null;
  status?: string;
}
