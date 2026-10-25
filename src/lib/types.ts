/**
 * Domain types.
 *
 * The persisted shape maps one to one to the Convex `titles` table: `titles` holds one row
 * per title, keyed by `mediaType:id`. See `docs/decisions.md`, D6.
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

/** Where a title sits in the library: still to watch, or already watched. */
export type TitleStatus = 'pending' | 'watched';

/** A title as stored in the library: a snapshot of its summary plus the user's own data. */
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
  status: TitleStatus;
  /** When it was first stored (ISO 8601). */
  addedAt: string;
  /** Last change to any field (ISO 8601); orders sync conflicts. */
  updatedAt: string;
  /** Personal rating from 1 to 5, or null when unrated. Only watched titles are rated. */
  rating: number | null;
  /** Watched date (YYYY-MM-DD), or null. Only watched titles have one. */
  watchedAt: string | null;
}

/** The whole persisted document; `version` allows schema migrations. */
export interface AppData {
  version: number;
  titles: Record<string, StoredTitle>;
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
