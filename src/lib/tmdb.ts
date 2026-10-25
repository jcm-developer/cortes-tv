/**
 * Read-only client for TheMovieDB API v3, called from the browser.
 *
 * Raw TMDB objects (snake case) are mapped to the app types at this boundary. See
 * `docs/domains/catalog.md`.
 */
import type {
  MediaSummary,
  MediaType,
  MediaDetail,
  CastMember,
  WatchProviders,
  WatchProvider,
} from './types';

const API_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

const API_KEY = import.meta.env.PUBLIC_TMDB_API_KEY ?? '';
const LANG = import.meta.env.PUBLIC_TMDB_LANG ?? 'es-ES';
const REGION = import.meta.env.PUBLIC_TMDB_REGION ?? 'ES';

/**
 * Checks whether a real TMDB API key is configured.
 *
 * @return False when the key is empty or still the `.env.example` placeholder.
 */
export const hasApiKey = () => Boolean(API_KEY && API_KEY !== 'tu_api_key_de_tmdb');

/**
 * A TMDB failure with a Spanish message that the UI can show as is.
 *
 * @param message - The user-facing message.
 * @param status - The HTTP status, when the server answered.
 */
export class TmdbError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'TmdbError';
  }
}

// --- Image sizes ------------------------------------------------------------
/** TMDB image sizes per use, chosen to keep mobile downloads small. */
export const ImageSize = {
  posterSmall: 'w185',
  poster: 'w342',
  posterLarge: 'w500',
  backdrop: 'w780',
  backdropLarge: 'w1280',
  profile: 'w185',
  logo: 'w92',
} as const;

/**
 * Builds the URL of a TMDB image.
 *
 * @param path - The image path from TMDB (`/abc.jpg`).
 * @param size - The TMDB size name, one of `ImageSize`.
 * @return The full URL, or null when there is no path.
 */
export function img(
  path: string | null | undefined,
  size: string = ImageSize.poster,
): string | null {
  if (!path) return null;
  return `${IMG_BASE}/${size}${path}`;
}

// --- Fetch with error handling ---------------------------------------------
/**
 * Calls a TMDB endpoint with the API key and language, and parses the JSON response.
 *
 * @param path - The endpoint path (`/movie/550`).
 * @param params - Extra query parameters; undefined, null and empty values are skipped.
 * @param signal - Aborts the request.
 * @return The parsed response body.
 * @throws TmdbError When the key is missing, the network fails or TMDB answers with an error.
 *     An `AbortError` is rethrown untouched.
 */
async function tmdbFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  signal?: AbortSignal,
): Promise<T> {
  if (!hasApiKey()) {
    throw new TmdbError('Falta la API key de TMDB (PUBLIC_TMDB_API_KEY).');
  }
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set('api_key', API_KEY);
  url.searchParams.set('language', LANG);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), { signal });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    throw new TmdbError('No se pudo conectar con TMDB. Revisa tu conexión.');
  }
  if (!res.ok) {
    if (res.status === 401) throw new TmdbError('API key de TMDB no válida.', 401);
    if (res.status === 404) throw new TmdbError('No encontrado.', 404);
    if (res.status === 429) throw new TmdbError('Demasiadas peticiones, prueba en unos segundos.', 429);
    throw new TmdbError(`Error de TMDB (${res.status}).`, res.status);
  }
  return res.json() as Promise<T>;
}

// --- Mappers ----------------------------------------------------------------
/** Returns the four-digit year of a TMDB date, or null when it has none. */
function yearFrom(date?: string | null): string | null {
  if (!date) return null;
  const y = date.slice(0, 4);
  return /^\d{4}$/.test(y) ? y : null;
}

interface RawMedia {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
  overview?: string;
}

/**
 * Maps a raw TMDB movie or TV result to a `MediaSummary`.
 *
 * @param raw - The raw result.
 * @param forceType - The media type, for endpoints whose results have no `media_type`.
 * @return The summary, or null for people and other non-title results.
 */
function mapSummary(raw: RawMedia, forceType?: MediaType): MediaSummary | null {
  const mediaType: MediaType | undefined =
    forceType ??
    (raw.media_type === 'movie' || raw.media_type === 'tv'
      ? (raw.media_type as MediaType)
      : undefined);
  if (!mediaType) return null;
  return {
    id: raw.id,
    mediaType,
    title: raw.title ?? raw.name ?? 'Sin título',
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
    year: yearFrom(raw.release_date ?? raw.first_air_date),
    voteAverage: typeof raw.vote_average === 'number' ? raw.vote_average : null,
    genreIds: raw.genre_ids ?? [],
    overview: raw.overview,
  };
}

// --- Public endpoints -------------------------------------------------------

/**
 * Searches movies and TV shows (`/search/multi`); people in the results are dropped.
 *
 * @param query - The search text.
 * @param signal - Aborts the request.
 * @return The first page of results; empty for a blank query.
 */
export async function searchMulti(
  query: string,
  signal?: AbortSignal,
): Promise<MediaSummary[]> {
  const q = query.trim();
  if (!q) return [];
  const data = await tmdbFetch<{ results: RawMedia[] }>(
    '/search/multi',
    { query: q, include_adult: 'false', page: 1 },
    signal,
  );
  return (data.results ?? [])
    .map((r) => mapSummary(r))
    .filter((m): m is MediaSummary => m !== null);
}

/**
 * Returns this week's trending movies and TV shows (`/trending/all/week`).
 *
 * @param signal - Aborts the request.
 * @return The trending titles.
 */
export async function trending(signal?: AbortSignal): Promise<MediaSummary[]> {
  const data = await tmdbFetch<{ results: RawMedia[] }>(
    '/trending/all/week',
    {},
    signal,
  );
  return (data.results ?? [])
    .map((r) => mapSummary(r))
    .filter((m): m is MediaSummary => m !== null);
}

/**
 * Fetches a list endpoint whose results carry no `media_type`.
 *
 * @param path - The endpoint path.
 * @param forceType - The media type of every result.
 * @param params - Extra query parameters.
 * @param signal - Aborts the request.
 * @return The titles that have a poster.
 */
async function fetchList(
  path: string,
  forceType: MediaType,
  params: Record<string, string | number | undefined> = {},
  signal?: AbortSignal,
): Promise<MediaSummary[]> {
  const data = await tmdbFetch<{ results: RawMedia[] }>(path, params, signal);
  return (data.results ?? [])
    .map((r) => mapSummary(r, forceType))
    .filter((m): m is MediaSummary => m !== null && !!m.posterPath);
}

/** Returns the top rated movies (`/movie/top_rated`). */
export const topRatedMovies = (signal?: AbortSignal) =>
  fetchList('/movie/top_rated', 'movie', { page: 1 }, signal);

/** Returns the top rated TV shows (`/tv/top_rated`). */
export const topRatedTv = (signal?: AbortSignal) =>
  fetchList('/tv/top_rated', 'tv', { page: 1 }, signal);

/** Returns the currently popular movies (`/movie/popular`). */
export const popularMovies = (signal?: AbortSignal) =>
  fetchList('/movie/popular', 'movie', { page: 1 }, signal);

/** Returns the currently popular TV shows (`/tv/popular`). */
export const popularTv = (signal?: AbortSignal) =>
  fetchList('/tv/popular', 'tv', { page: 1 }, signal);

/** Returns classic movies: best rated with at least 4000 votes, released up to 2000. */
export const classicMovies = (signal?: AbortSignal) =>
  fetchList(
    '/discover/movie',
    'movie',
    {
      sort_by: 'vote_average.desc',
      'vote_count.gte': 4000,
      'primary_release_date.lte': '2000-12-31',
    },
    signal,
  );

/** Returns the movies now in theaters in the configured region (`/movie/now_playing`). */
export const nowPlaying = (signal?: AbortSignal) =>
  fetchList('/movie/now_playing', 'movie', { page: 1, region: REGION }, signal);

/**
 * Returns the titles TMDB recommends for a movie or TV show (`/{type}/{id}/recommendations`).
 *
 * @param mediaType - The media type of the source title.
 * @param id - The TMDB id of the source title.
 * @param signal - Aborts the request.
 * @return The first page of recommended titles that have a poster.
 */
export async function recommendationsFor(
  mediaType: MediaType,
  id: number,
  signal?: AbortSignal,
): Promise<MediaSummary[]> {
  const data = await tmdbFetch<{ results: RawMedia[] }>(
    `/${mediaType}/${id}/recommendations`,
    { page: 1 },
    signal,
  );
  // Results carry their own media_type; fall back to the source type when one is missing.
  return (data.results ?? [])
    .map((r) => mapSummary(r, r.media_type === 'movie' || r.media_type === 'tv' ? undefined : mediaType))
    .filter((m): m is MediaSummary => m !== null && !!m.posterPath);
}

interface RawDetail extends RawMedia {
  genres?: { id: number; name: string }[];
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  tagline?: string | null;
  status?: string;
  credits?: { cast?: { id: number; name: string; character?: string; profile_path?: string | null }[] };
  'watch/providers'?: {
    results?: Record<
      string,
      {
        link?: string;
        flatrate?: RawProvider[];
        rent?: RawProvider[];
        buy?: RawProvider[];
      }
    >;
  };
}

interface RawProvider {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
}

/**
 * Maps the watch providers of one region.
 *
 * @param raw - The raw detail, with `watch/providers` appended.
 * @param region - The preferred region; falls back to `US`, then to the first region returned.
 * @return The providers, or null when TMDB has none.
 */
function mapProviders(
  raw: RawDetail,
  region: string,
): WatchProviders | null {
  const results = raw['watch/providers']?.results;
  if (!results) return null;
  const r = results[region] ?? results['US'] ?? Object.values(results)[0];
  if (!r) return null;
  const map = (arr?: RawProvider[]): WatchProvider[] =>
    (arr ?? []).map((p) => ({
      providerId: p.provider_id,
      providerName: p.provider_name,
      logoPath: p.logo_path ?? null,
    }));
  return {
    link: r.link ?? null,
    flatrate: map(r.flatrate),
    rent: map(r.rent),
    buy: map(r.buy),
  };
}

/**
 * Returns the full detail of a movie or TV show, with cast and watch providers, in one request.
 *
 * @param mediaType - The media type.
 * @param id - The TMDB id.
 * @param signal - Aborts the request.
 * @return The detail, with the first 18 cast members.
 */
export async function getDetail(
  mediaType: MediaType,
  id: number,
  signal?: AbortSignal,
): Promise<MediaDetail> {
  const raw = await tmdbFetch<RawDetail>(
    `/${mediaType}/${id}`,
    { append_to_response: 'credits,watch/providers' },
    signal,
  );
  const summary = mapSummary(raw, mediaType);
  const cast: CastMember[] = (raw.credits?.cast ?? [])
    .slice(0, 18)
    .map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character ?? '',
      profilePath: c.profile_path ?? null,
    }));
  return {
    ...(summary as MediaSummary),
    genres: raw.genres ?? [],
    runtime: mediaType === 'movie' ? raw.runtime ?? null : null,
    seasons: mediaType === 'tv' ? raw.number_of_seasons ?? null : null,
    episodes: mediaType === 'tv' ? raw.number_of_episodes ?? null : null,
    tagline: raw.tagline ?? null,
    status: raw.status,
    cast,
    providers: mapProviders(raw, REGION),
  };
}

// --- Genres (memory and localStorage cache) ---------------------------------
let genreCache: Record<number, string> | null = null;

/**
 * Returns the names of every movie and TV genre, by id.
 *
 * Cached in memory and in `localStorage` with no expiry, so a language change needs the
 * `cortes-tv:genres` key cleared.
 *
 * @return The genre map.
 */
export async function getGenreMap(): Promise<Record<number, string>> {
  if (genreCache) return genreCache;
  try {
    const cached = localStorage.getItem('cortes-tv:genres');
    if (cached) {
      genreCache = JSON.parse(cached);
      return genreCache!;
    }
  } catch {
    /* ignore */
  }
  const [movie, tv] = await Promise.all([
    tmdbFetch<{ genres: { id: number; name: string }[] }>('/genre/movie/list'),
    tmdbFetch<{ genres: { id: number; name: string }[] }>('/genre/tv/list'),
  ]);
  const map: Record<number, string> = {};
  for (const g of [...movie.genres, ...tv.genres]) map[g.id] = g.name;
  genreCache = map;
  try {
    localStorage.setItem('cortes-tv:genres', JSON.stringify(map));
  } catch {
    /* ignore */
  }
  return map;
}
