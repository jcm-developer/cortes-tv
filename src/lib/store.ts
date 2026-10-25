/**
 * App data: the user's lists and titles, persisted in `localStorage`.
 *
 * Every mutation goes through the functions here, which keep titles and lists consistent and
 * return a new `AppData` object so subscribers update. See `docs/domains/library.md`.
 */
import { writable, derived, get } from 'svelte/store';
import type { AppData, MovieList, StoredTitle, MediaSummary } from './types';

const STORAGE_KEY = 'cortes-tv:data';
const SCHEMA_VERSION = 1;

/** Returns the current time in ISO 8601. */
function nowISO(): string {
  return new Date().toISOString();
}

/** Returns the stable title key, `mediaType:id`. */
function keyFor(mediaType: string, id: number): string {
  return `${mediaType}:${id}`;
}

/**
 * Returns a new unique id for a list.
 *
 * @return A UUID, or a time and random based id where `crypto.randomUUID` is missing.
 */
function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `list_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Returns empty data; there are no default lists, the user creates every list. */
function defaultData(): AppData {
  return { version: SCHEMA_VERSION, titles: {}, lists: [] };
}

/**
 * Validates and cleans data read from storage or an import.
 *
 * Drops malformed lists and item keys that point to missing titles, and marks every list as
 * user-owned (`predefined: false`).
 *
 * @param data - The parsed data, possibly partial or invalid.
 * @return Clean data at the current schema version; empty data when the input is not an object.
 */
function normalize(data: Partial<AppData> | null | undefined): AppData {
  if (!data || typeof data !== 'object') return defaultData();

  const titles = (data.titles && typeof data.titles === 'object' ? data.titles : {}) as Record<
    string,
    StoredTitle
  >;
  const incomingLists = Array.isArray(data.lists) ? data.lists : [];

  const lists: MovieList[] = [];
  for (const l of incomingLists) {
    if (!l || typeof l.id !== 'string' || typeof l.name !== 'string') continue;
    lists.push({
      id: l.id,
      name: l.name,
      predefined: false,
      createdAt: l.createdAt ?? nowISO(),
      itemKeys: Array.isArray(l.itemKeys) ? l.itemKeys.filter((k) => titles[k]) : [],
    });
  }

  return { version: SCHEMA_VERSION, titles, lists };
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
  // debounce ligero para no escribir en cada microcambio
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* cuota llena u otro error: se ignora silenciosamente */
    }
  }, 150);
});

// --- Derived stores ---------------------------------------------------------
/** The user's lists, in creation order. */
export const lists = derived(appData, ($d) => $d.lists);

/** The 20 most recently added titles, newest first. */
export const recentlyAdded = derived(appData, ($d) => {
  return Object.values($d.titles)
    .slice()
    .sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1))
    .slice(0, 20);
});

/** The number of titles in each list, by list id. */
export const listCounts = derived(appData, ($d) => {
  const m: Record<string, number> = {};
  for (const l of $d.lists) m[l.id] = l.itemKeys.length;
  return m;
});

// --- Operations -------------------------------------------------------------

/**
 * Returns a stored title.
 *
 * @param key - The title key, `mediaType:id`.
 * @return The stored title, or undefined when no list holds it.
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
 * Returns the lists that hold a title.
 *
 * @param key - The title key, `mediaType:id`.
 * @return The ids of those lists, in list order.
 */
export function listsContaining(key: string): string[] {
  return get(appData)
    .lists.filter((l) => l.itemKeys.includes(key))
    .map((l) => l.id);
}

/**
 * Adds a title to the top of a list, storing its snapshot when it is new.
 *
 * Does nothing to the list when it already holds the title.
 *
 * @param summary - The title, as returned by TMDB.
 * @param listId - The target list id.
 */
export function addToList(summary: MediaSummary, listId: string): void {
  const key = keyFor(summary.mediaType, summary.id);
  appData.update((d) => {
    if (!d.titles[key]) {
      const stored: StoredTitle = {
        key,
        id: summary.id,
        mediaType: summary.mediaType,
        title: summary.title,
        posterPath: summary.posterPath,
        backdropPath: summary.backdropPath,
        year: summary.year,
        voteAverage: summary.voteAverage,
        genreIds: summary.genreIds,
        addedAt: nowISO(),
        rating: null,
        watchedAt: null,
      };
      d.titles = { ...d.titles, [key]: stored };
    }
    d.lists = d.lists.map((l) =>
      l.id === listId && !l.itemKeys.includes(key)
        ? { ...l, itemKeys: [key, ...l.itemKeys] }
        : l,
    );
    return { ...d };
  });
}

/**
 * Removes a title from a list, and deletes its snapshot when no list holds it any more.
 *
 * The snapshot carries the rating and watched date, so removing a title from its last list
 * loses them.
 *
 * @param key - The title key, `mediaType:id`.
 * @param listId - The list id.
 */
export function removeFromList(key: string, listId: string): void {
  appData.update((d) => {
    d.lists = d.lists.map((l) =>
      l.id === listId ? { ...l, itemKeys: l.itemKeys.filter((k) => k !== key) } : l,
    );
    const stillUsed = d.lists.some((l) => l.itemKeys.includes(key));
    if (!stillUsed) {
      const { [key]: _drop, ...rest } = d.titles;
      d.titles = rest;
    }
    return { ...d };
  });
}

/**
 * Moves a title from one list to the top of another.
 *
 * @param key - The title key, `mediaType:id`.
 * @param fromListId - The source list id.
 * @param toListId - The target list id; nothing happens when it equals the source.
 */
export function moveToList(key: string, fromListId: string, toListId: string): void {
  if (fromListId === toListId) return;
  appData.update((d) => {
    d.lists = d.lists.map((l) => {
      if (l.id === fromListId) return { ...l, itemKeys: l.itemKeys.filter((k) => k !== key) };
      if (l.id === toListId && !l.itemKeys.includes(key))
        return { ...l, itemKeys: [key, ...l.itemKeys] };
      return l;
    });
    return { ...d };
  });
}

/**
 * Adds a title to a list, or removes it when the list already holds it.
 *
 * @param summary - The title.
 * @param listId - The list id.
 */
export function toggleInList(summary: MediaSummary, listId: string): void {
  const key = keyFor(summary.mediaType, summary.id);
  if (listsContaining(key).includes(listId)) removeFromList(key, listId);
  else addToList(summary, listId);
}

// --- Personal data ----------------------------------------------------------
/**
 * Sets the personal rating of a stored title; does nothing when the title is not stored.
 *
 * @param key - The title key, `mediaType:id`.
 * @param rating - The rating from 1 to 5, or null to clear it.
 */
export function setRating(key: string, rating: number | null): void {
  appData.update((d) => {
    const t = d.titles[key];
    if (!t) return d;
    d.titles = { ...d.titles, [key]: { ...t, rating } };
    return { ...d };
  });
}

/**
 * Sets the watched date of a stored title; does nothing when the title is not stored.
 *
 * @param key - The title key, `mediaType:id`.
 * @param watchedAt - The date as YYYY-MM-DD, or null to clear it.
 */
export function setWatchedAt(key: string, watchedAt: string | null): void {
  appData.update((d) => {
    const t = d.titles[key];
    if (!t) return d;
    d.titles = { ...d.titles, [key]: { ...t, watchedAt } };
    return { ...d };
  });
}

// --- List management --------------------------------------------------------
/**
 * Creates an empty list at the end.
 *
 * @param name - The list name; a blank name becomes "Nueva lista".
 * @return The new list id.
 */
export function createList(name: string): string {
  const id = makeId();
  appData.update((d) => {
    d.lists = [
      ...d.lists,
      { id, name: name.trim() || 'Nueva lista', predefined: false, createdAt: nowISO(), itemKeys: [] },
    ];
    return { ...d };
  });
  return id;
}

/**
 * Renames a list.
 *
 * @param listId - The list id.
 * @param name - The new name; a blank name keeps the current one.
 */
export function renameList(listId: string, name: string): void {
  appData.update((d) => {
    d.lists = d.lists.map((l) =>
      l.id === listId && !l.predefined ? { ...l, name: name.trim() || l.name } : l,
    );
    return { ...d };
  });
}

/**
 * Deletes a list and every title snapshot that no other list holds.
 *
 * @param listId - The list id.
 */
export function deleteList(listId: string): void {
  appData.update((d) => {
    const list = d.lists.find((l) => l.id === listId);
    if (!list || list.predefined) return d;
    d.lists = d.lists.filter((l) => l.id !== listId);
    // Titles live only while a list holds them (docs/domains/library.md).
    const used = new Set(d.lists.flatMap((l) => l.itemKeys));
    d.titles = Object.fromEntries(Object.entries(d.titles).filter(([k]) => used.has(k)));
    return { ...d };
  });
}

// --- Export / Import --------------------------------------------------------
/** Downloads the whole app data as `cortes-tv-backup-YYYY-MM-DD.json`. */
export function exportJSON(): void {
  const data = get(appData);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `cortes-tv-backup-${stamp}.json`;
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
 * Imports app data from a JSON backup.
 *
 * The data goes through `normalize` first. A merge adds the incoming titles (incoming
 * snapshots win) and joins each incoming list to an existing one by id, then by name; lists
 * with no match are appended.
 *
 * @param text - The file contents.
 * @param mode - `replace` swaps the current data, `merge` combines both.
 * @return The outcome; `ok` is false only when the text is not valid JSON.
 */
export function importJSON(text: string, mode: 'replace' | 'merge' = 'replace'): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: 'El archivo no es un JSON válido.' };
  }
  const incoming = normalize(parsed as Partial<AppData>);

  if (mode === 'replace') {
    appData.set(incoming);
    return { ok: true, message: 'Datos importados (reemplazados).' };
  }

  // merge
  appData.update((d) => {
    const titles = { ...d.titles, ...incoming.titles };
    const lists = d.lists.map((l) => ({ ...l, itemKeys: [...l.itemKeys] }));
    for (const inc of incoming.lists) {
      const target = lists.find((l) => l.id === inc.id) ?? lists.find((l) => l.name === inc.name && !l.predefined);
      if (target) {
        for (const k of inc.itemKeys) if (!target.itemKeys.includes(k)) target.itemKeys.push(k);
      } else {
        lists.push({ ...inc });
      }
    }
    return { version: SCHEMA_VERSION, titles, lists };
  });
  return { ok: true, message: 'Datos combinados con los actuales.' };
}
