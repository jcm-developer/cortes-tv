// =============================================================================
// Tipos de dominio. La estructura está pensada para migrar a una BBDD externa
// (p. ej. Supabase) sin rehacer la app: `titles` es una tabla normalizada y
// `lists` + `list.itemKeys` modelan una relación N:M (join table list_items).
// =============================================================================

export type MediaType = 'movie' | 'tv';

/** Resultado ligero de búsqueda / carrusel. */
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

/** Título tal y como se guarda en local (snapshot + datos personales). */
export interface StoredTitle {
  /** Clave única estable: `${mediaType}:${id}`. */
  key: string;
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  year: string | null;
  voteAverage: number | null;
  genreIds: number[];
  /** Cuándo se guardó por primera vez (ISO 8601). */
  addedAt: string;
  /** Valoración personal 1–5 (null = sin valorar). */
  rating: number | null;
  /** Fecha de visto (ISO 8601 date) o null. */
  watchedAt: string | null;
}

/** Una lista. Las predefinidas (`predefined: true`) no se pueden eliminar. */
export interface MovieList {
  id: string;
  name: string;
  predefined: boolean;
  createdAt: string;
  /** Claves de títulos, en orden (primero = añadido más reciente). */
  itemKeys: string[];
}

/** Documento completo persistido. `version` permite migraciones de esquema. */
export interface AppData {
  version: number;
  titles: Record<string, StoredTitle>;
  lists: MovieList[];
}

// --- Detalle (vista inmersiva) ----------------------------------------------

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface WatchProvider {
  providerId: number;
  providerName: string;
  logoPath: string | null;
}

export interface WatchProviders {
  link: string | null;
  flatrate: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
}

export interface MediaDetail extends MediaSummary {
  genres: { id: number; name: string }[];
  /** Duración en minutos (películas). */
  runtime: number | null;
  /** Nº de temporadas (series). */
  seasons: number | null;
  episodes: number | null;
  tagline: string | null;
  cast: CastMember[];
  providers: WatchProviders | null;
  status?: string;
}
