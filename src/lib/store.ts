/**
 * Library data: the titles the user tracks, each pending or watched, persisted in
 * `localStorage`.
 *
 * Every mutation goes through the functions here, which keep the invariants (only watched
 * titles carry a rating and a watched date) and return a new `AppData` object so subscribers
 * update. See `docs/domains/library.md`.
 */
import { writable, derived, get } from 'svelte/store';
import type { AppData, MediaSummary, MediaType, StoredTitle, TitleStatus } from './types';
import { todayDate } from './format';

const STORAGE_KEY = 'cortes-tv:data';
const SCHEMA_VERSION = 2;

/** List names that mark a v1 list as "already watched" during the migration. */
const WATCHED_LIST_NAME = /\b(vist[oa]s?|watched|seen)\b/i;

/** Returns the current time in ISO 8601. */
function nowISO(): string {
  return new Date().toISOString();
}

/** Returns the stable title key, `mediaType:id`. */
function keyFor(mediaType: string, id: number): string {
  return `${mediaType}:${id}`;
}

/** Returns empty data. */
function defaultData(): AppData {
  return { version: SCHEMA_VERSION, titles: {} };
}

// --- Validation and migration -------------------------------------------------

/** Returns the value when it is a string, otherwise null. */
function str(v: unknown): string | null {
  return typeof v === 'string' && v !== '' ? v : null;
}

/**
 * Returns a timestamp as a UTC ISO string with milliseconds.
 *
 * Postgres answers `+00:00` and microseconds; one canonical form keeps the string comparisons
 * of `updatedAt` in merges and sync correct.
 */
function isoTime(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Returns the value when it is a finite number, otherwise null. */
function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Validates one stored title from storage, an import or the database.
 *
 * @param raw - The untrusted title object.
 * @param fallbackStatus - The status to use when the object has none (v1 data).
 * @return The clean title, or null when its identity (media type and id) is invalid.
 */
export function cleanTitle(raw: unknown, fallbackStatus: TitleStatus = 'pending'): StoredTitle | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const mediaType = r.mediaType === 'movie' || r.mediaType === 'tv' ? (r.mediaType as MediaType) : null;
  const id = num(r.id);
  if (!mediaType || id === null || !Number.isInteger(id) || id <= 0) return null;

  const status: TitleStatus =
    r.status === 'pending' || r.status === 'watched' ? r.status : fallbackStatus;
  const rating = num(r.rating);
  const watchedAt = str(r.watchedAt);
  const addedAt = isoTime(r.addedAt) ?? nowISO();
  const watched = status === 'watched';

  return {
    key: keyFor(mediaType, id),
    id,
    mediaType,
    title: str(r.title) ?? 'Sin título',
    posterPath: str(r.posterPath),
    backdropPath: str(r.backdropPath),
    year: str(r.year),
    voteAverage: num(r.voteAverage),
    genreIds: Array.isArray(r.genreIds) ? r.genreIds.filter((g): g is number => Number.isInteger(g)) : [],
    status,
    addedAt,
    updatedAt: isoTime(r.updatedAt) ?? addedAt,
    rating: watched && rating !== null && rating >= 1 && rating <= 5 ? Math.round(rating) : null,
    watchedAt: watched && watchedAt && /^\d{4}-\d{2}-\d{2}$/.test(watchedAt) ? watchedAt : null,
  };
}

/**
 * Migrates a v1 document (user lists joined to titles) to the v2 statuses.
 *
 * A title becomes watched when it has a rating or a watched date, or when a list whose name
 * says "watched" (`WATCHED_LIST_NAME`) holds it; every other listed title becomes pending.
 * Titles that no list holds were orphans in v1 and are dropped.
 *
 * @param data - The v1 document, untrusted.
 * @return The titles at v2, by key.
 */
function migrateV1(data: Record<string, unknown>): Record<string, StoredTitle> {
  const titles = (data.titles && typeof data.titles === 'object' ? data.titles : {}) as Record<
    string,
    Record<string, unknown>
  >;
  const lists = Array.isArray(data.lists) ? (data.lists as Record<string, unknown>[]) : [];

  const listed = new Set<string>();
  const inWatchedList = new Set<string>();
  for (const l of lists) {
    if (!l || !Array.isArray(l.itemKeys)) continue;
    const watchedList = typeof l.name === 'string' && WATCHED_LIST_NAME.test(l.name);
    for (const k of l.itemKeys) {
      if (typeof k !== 'string') continue;
      listed.add(k);
      if (watchedList) inWatchedList.add(k);
    }
  }

  const out: Record<string, StoredTitle> = {};
  for (const [k, raw] of Object.entries(titles)) {
    if (!listed.has(k) || !raw || typeof raw !== 'object') continue;
    const watched = raw.rating != null || raw.watchedAt != null || inWatchedList.has(k);
    const t = cleanTitle({ ...raw, status: watched ? 'watched' : 'pending' });
    if (t) out[t.key] = t;
  }
  return out;
}

/**
 * Validates and cleans data read from storage or an import, migrating older versions.
 *
 * @param data - The parsed data, possibly partial, invalid or from schema v1.
 * @return Clean data at the current schema version; empty data when the input is not an object.
 */
export function normalize(data: unknown): AppData {
  if (!data || typeof data !== 'object') return defaultData();
  const d = data as Record<string, unknown>;

  if (Array.isArray(d.lists)) return { version: SCHEMA_VERSION, titles: migrateV1(d) };

  const titles: Record<string, StoredTitle> = {};
  const raw = d.titles && typeof d.titles === 'object' ? (d.titles as Record<string, unknown>) : {};
  for (const value of Object.values(raw)) {
    const t = cleanTitle(value);
    if (t) titles[t.key] = t;
  }
  return { version: SCHEMA_VERSION, titles };
}

/**
 * Loads the data from storage.
 *
 * @return The stored data, or empty data when there is none or it cannot be parsed.
 */
function load(): AppData {
  if (typeof localStorage === 'undefined') return defaultData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    return normalize(JSON.parse(raw));
  } catch {
    return defaultData();
  }
}

// --- Main store -------------------------------------------------------------
/** The whole app data; written back to storage 150 ms after the last change. */
export const appData = writable<AppData>(load());

let persistTimer: ReturnType<typeof setTimeout> | null = null;
appData.subscribe((data) => {
  if (typeof localStorage === 'undefined') return;
  // Debounced so a burst of changes writes once.
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* Quota full or storage blocked: the in-memory data stays usable. */
    }
  }, 150);
});

// --- Derived stores ---------------------------------------------------------
/** Pending titles, most recently added first. */
export const pendingTitles = derived(appData, ($d) =>
  Object.values($d.titles)
    .filter((t) => t.status === 'pending')
    .sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1)),
);

/** Watched titles, most recently watched first (then most recently changed). */
export const watchedTitles = derived(appData, ($d) =>
  Object.values($d.titles)
    .filter((t) => t.status === 'watched')
    .sort(
      (a, b) =>
        (b.watchedAt ?? '').localeCompare(a.watchedAt ?? '') ||
        b.updatedAt.localeCompare(a.updatedAt),
    ),
);

// --- Reads --------------------------------------------------------------------

/**
 * Returns a stored title.
 *
 * @param key - The title key, `mediaType:id`.
 * @return The stored title, or undefined when it is not in the library.
 */
export function getTitle(key: string): StoredTitle | undefined {
  return get(appData).titles[key];
}

/**
 * Returns the stable key of a title.
 *
 * @param item - The title, with its media type and TMDB id.
 * @return The key, `mediaType:id`.
 */
export function summaryKey(item: { mediaType: string; id: number }): string {
  return keyFor(item.mediaType, item.id);
}

/**
 * Returns the TMDB summary fields of a stored title.
 *
 * @param t - The stored title.
 * @return The summary, as the catalog components expect it.
 */
export function toSummary(t: StoredTitle): MediaSummary {
  return {
    id: t.id,
    mediaType: t.mediaType,
    title: t.title,
    posterPath: t.posterPath,
    backdropPath: t.backdropPath,
    year: t.year,
    voteAverage: t.voteAverage,
    genreIds: t.genreIds,
  };
}

// --- Mutations ----------------------------------------------------------------

/** Listeners told which keys a local mutation changed (the sync layer uses it). */
const changeListeners = new Set<(keys: string[]) => void>();

/**
 * Registers a listener for local changes.
 *
 * @param fn - Called with the changed keys after every mutation made through this module.
 * @return A function that removes the listener.
 */
export function onLocalChange(fn: (keys: string[]) => void): () => void {
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}

/**
 * Applies a change to the titles and notifies the change listeners.
 *
 * @param keys - The keys the change touches.
 * @param fn - Mutates the copy of the titles it receives.
 */
function mutate(keys: string[], fn: (titles: Record<string, StoredTitle>) => void): void {
  appData.update((d) => {
    const titles = { ...d.titles };
    fn(titles);
    return { ...d, titles };
  });
  for (const l of changeListeners) l(keys);
}

/**
 * Builds a new stored title from a TMDB summary.
 *
 * @param s - The summary.
 * @param status - The initial status.
 * @return The title, with no rating and no watched date.
 */
function fromSummary(s: MediaSummary, status: TitleStatus): StoredTitle {
  const now = nowISO();
  return {
    key: keyFor(s.mediaType, s.id),
    id: s.id,
    mediaType: s.mediaType,
    title: s.title,
    posterPath: s.posterPath,
    backdropPath: s.backdropPath,
    year: s.year,
    voteAverage: s.voteAverage,
    genreIds: s.genreIds,
    status,
    addedAt: now,
    updatedAt: now,
    rating: null,
    watchedAt: null,
  };
}

/**
 * Puts a title in the library with a status, adding it when it is new.
 *
 * Marking a title watched sets today as its watched date when it has none. Moving it back to
 * pending clears the rating and the watched date, which only make sense for watched titles.
 *
 * @param summary - The title, as returned by TMDB or taken from the library.
 * @param status - The new status.
 */
export function setStatus(summary: MediaSummary, status: TitleStatus): void {
  const key = keyFor(summary.mediaType, summary.id);
  mutate([key], (titles) => {
    const current = titles[key] ?? fromSummary(summary, status);
    titles[key] = {
      ...current,
      status,
      rating: status === 'watched' ? current.rating : null,
      watchedAt: status === 'watched' ? current.watchedAt ?? todayDate() : null,
      updatedAt: nowISO(),
    };
  });
}

/**
 * Removes a title from the library, with its rating and watched date.
 *
 * @param key - The title key, `mediaType:id`.
 */
export function removeTitle(key: string): void {
  if (!getTitle(key)) return;
  mutate([key], (titles) => {
    delete titles[key];
  });
}

/**
 * Puts back a title removed with `removeTitle`, for an undo action.
 *
 * @param t - The title as it was before the removal.
 */
export function restoreTitle(t: StoredTitle): void {
  mutate([t.key], (titles) => {
    titles[t.key] = { ...t, updatedAt: nowISO() };
  });
}

/**
 * Sets the personal rating of a watched title; does nothing for other titles.
 *
 * @param key - The title key, `mediaType:id`.
 * @param rating - The rating from 1 to 5, or null to clear it.
 */
export function setRating(key: string, rating: number | null): void {
  const t = getTitle(key);
  if (!t || t.status !== 'watched') return;
  mutate([key], (titles) => {
    titles[key] = { ...t, rating, updatedAt: nowISO() };
  });
}

/**
 * Sets the watched date of a watched title; does nothing for other titles.
 *
 * @param key - The title key, `mediaType:id`.
 * @param watchedAt - The date as YYYY-MM-DD, or null to clear it.
 */
export function setWatchedAt(key: string, watchedAt: string | null): void {
  const t = getTitle(key);
  if (!t || t.status !== 'watched') return;
  mutate([key], (titles) => {
    titles[key] = { ...t, watchedAt, updatedAt: nowISO() };
  });
}

/**
 * Replaces the whole library, for example with the data pulled from the server.
 *
 * Does not notify the change listeners: the caller already owns the new data. Persists
 * synchronously.
 *
 * @param titles - The new titles, already validated.
 */
export function replaceTitles(titles: Record<string, StoredTitle>): void {
  const data = { version: SCHEMA_VERSION, titles };
  appData.set(data);
  // Written at once, not debounced: after a sign-out, closing the tab within the debounce
  // window must not leave the previous user's titles in storage.
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* Quota full or storage blocked. */
  }
}

// --- Export / Import --------------------------------------------------------
/** Downloads the whole app data as `cortes-tv-backup-YYYY-MM-DD.json`. */
export function exportJSON(): void {
  const data = get(appData);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cortes-tv-backup-${todayDate()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** The outcome of an import, with a Spanish message for a toast. */
export interface ImportResult {
  ok: boolean;
  message: string;
}

/**
 * Imports a JSON backup, from schema v1 (lists) or v2 (statuses).
 *
 * The data goes through `normalize` first, which migrates v1 lists to statuses. A merge keeps
 * the most recently changed version of each title.
 *
 * @param text - The file contents.
 * @param mode - `replace` swaps the current data, `merge` combines both.
 * @return The outcome; `ok` is false only when the text is not valid JSON.
 */
export function importJSON(text: string, mode: 'replace' | 'merge' = 'merge'): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: 'El archivo no es un JSON válido.' };
  }
  const incoming = normalize(parsed).titles;
  const before = Object.keys(get(appData).titles);
  const keys = [...new Set([...before, ...Object.keys(incoming)])];
  const count = Object.keys(incoming).length;

  if (mode === 'replace') {
    mutate(keys, (titles) => {
      for (const k of Object.keys(titles)) delete titles[k];
      Object.assign(titles, incoming);
    });
    return { ok: true, message: `${count} títulos importados.` };
  }

  mutate(Object.keys(incoming), (titles) => {
    for (const [k, t] of Object.entries(incoming)) {
      const current = titles[k];
      if (!current || current.updatedAt <= t.updatedAt) titles[k] = t;
    }
  });
  return { ok: true, message: `${count} títulos combinados con los actuales.` };
}
