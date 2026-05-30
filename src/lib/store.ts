// =============================================================================
// Estado de la app: listas + títulos, persistido en localStorage.
// Expone helpers para añadir/mover/quitar títulos y para exportar/importar JSON.
// =============================================================================
import { writable, derived, get } from 'svelte/store';
import type { AppData, MovieList, StoredTitle, MediaSummary } from './types';

const STORAGE_KEY = 'cortes-tv:data';
const SCHEMA_VERSION = 1;

function nowISO(): string {
  return new Date().toISOString();
}

function keyFor(mediaType: string, id: number): string {
  return `${mediaType}:${id}`;
}

function makeId(): string {
  // id estable para listas creadas por el usuario
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `list_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function defaultData(): AppData {
  // El usuario crea todas sus listas a mano; no hay listas por defecto.
  return { version: SCHEMA_VERSION, titles: {}, lists: [] };
}

/** Valida y limpia el esquema. Todas las listas pertenecen al usuario. */
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

// --- Store principal --------------------------------------------------------
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

// --- Derivados útiles -------------------------------------------------------
export const lists = derived(appData, ($d) => $d.lists);

export const recentlyAdded = derived(appData, ($d) => {
  return Object.values($d.titles)
    .slice()
    .sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1))
    .slice(0, 20);
});

/** Cuenta de elementos por lista. */
export const listCounts = derived(appData, ($d) => {
  const m: Record<string, number> = {};
  for (const l of $d.lists) m[l.id] = l.itemKeys.length;
  return m;
});

// --- Operaciones ------------------------------------------------------------

export function getTitle(key: string): StoredTitle | undefined {
  return get(appData).titles[key];
}

export function summaryKey(item: { mediaType: string; id: number }): string {
  return keyFor(item.mediaType, item.id);
}

/** ¿En qué listas está un título? */
export function listsContaining(key: string): string[] {
  return get(appData)
    .lists.filter((l) => l.itemKeys.includes(key))
    .map((l) => l.id);
}

/** Añade un título (desde búsqueda) a una lista. Crea el snapshot si no existe. */
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

/** Quita un título de una lista (si queda sin listas, elimina el snapshot). */
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

/** Mueve un título de una lista a otra. */
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

/** Activa/desactiva la pertenencia de un título a una lista. */
export function toggleInList(summary: MediaSummary, listId: string): void {
  const key = keyFor(summary.mediaType, summary.id);
  if (listsContaining(key).includes(listId)) removeFromList(key, listId);
  else addToList(summary, listId);
}

// --- Datos personales -------------------------------------------------------
export function setRating(key: string, rating: number | null): void {
  appData.update((d) => {
    const t = d.titles[key];
    if (!t) return d;
    d.titles = { ...d.titles, [key]: { ...t, rating } };
    return { ...d };
  });
}

export function setWatchedAt(key: string, watchedAt: string | null): void {
  appData.update((d) => {
    const t = d.titles[key];
    if (!t) return d;
    d.titles = { ...d.titles, [key]: { ...t, watchedAt } };
    return { ...d };
  });
}

// --- Gestión de listas ------------------------------------------------------
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

export function renameList(listId: string, name: string): void {
  appData.update((d) => {
    d.lists = d.lists.map((l) =>
      l.id === listId && !l.predefined ? { ...l, name: name.trim() || l.name } : l,
    );
    return { ...d };
  });
}

export function deleteList(listId: string): void {
  appData.update((d) => {
    const list = d.lists.find((l) => l.id === listId);
    if (!list || list.predefined) return d;
    d.lists = d.lists.filter((l) => l.id !== listId);
    // limpia títulos que ya no pertenezcan a ninguna lista
    const used = new Set(d.lists.flatMap((l) => l.itemKeys));
    d.titles = Object.fromEntries(Object.entries(d.titles).filter(([k]) => used.has(k)));
    return { ...d };
  });
}

// --- Export / Import --------------------------------------------------------
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

export interface ImportResult {
  ok: boolean;
  message: string;
}

/** Importa desde texto JSON. mode 'replace' sustituye, 'merge' combina. */
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
