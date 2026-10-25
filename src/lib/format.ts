/** Small formatting helpers for the UI; output strings are Spanish. */

/**
 * Formats a runtime in minutes as hours and minutes ("1 h 45 min", "2 h", "50 min").
 *
 * @param min - The runtime in minutes.
 * @return The formatted runtime, or null when it is missing or not positive.
 */
export function formatRuntime(min: number | null): string | null {
  if (!min || min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/**
 * Formats a TMDB vote average with one decimal.
 *
 * @param vote - The vote average, from 0 to 10.
 * @return The formatted vote, or null when it is missing or zero (TMDB's "no votes").
 */
export function formatVote(vote: number | null): string | null {
  if (vote === null || vote === undefined || vote <= 0) return null;
  return vote.toFixed(1);
}

/**
 * Returns the Spanish label of a media type.
 *
 * @param t - The media type.
 * @return "Película" for movies, "Serie" for TV shows.
 */
export function mediaTypeLabel(t: 'movie' | 'tv'): string {
  return t === 'movie' ? 'Película' : 'Serie';
}

/**
 * Formats an ISO date as a short Spanish date ("5 mar 2024").
 *
 * @param iso - The date in ISO 8601.
 * @return The formatted date, or null when it is missing or invalid.
 */
export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Returns today's date as YYYY-MM-DD, the value format of date inputs.
 *
 * Uses UTC, so near midnight it can differ from the local date.
 *
 * @return Today's date.
 */
export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}
