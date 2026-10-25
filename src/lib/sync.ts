/**
 * Cloud sync of the library with the Convex `titles` table.
 *
 * The local library stays the source the UI reads, so the app works offline. Local changes
 * mark their keys dirty (persisted, so they survive a reload); a flush sends those rows with
 * the `upsertMany` and `removeMany` mutations. A live subscription to `titles.list` replaces the
 * local library with every new server state, except dirty keys, which keep the local version
 * until they are flushed. See `docs/domains/library.md`.
 */
import { writable, get } from 'svelte/store';
import { appData, cleanTitle, onLocalChange, replaceTitles } from './store';
import type { StoredTitle } from './types';
import { cloudEnabled, getClients } from './convex';
import { cloudUser, logout, type CloudUser } from './auth';
import { api } from '../../convex/_generated/api';
import type { FunctionReturnType } from 'convex/server';

const DIRTY_KEY = 'cortes-tv:dirty';
/** Id of the user the local library belongs to; empty for data created before any login. */
const OWNER_KEY = 'cortes-tv:owner';
const FLUSH_DELAY_MS = 800;
/** Titles or keys per mutation; the server rejects bigger batches. */
const CHUNK_SIZE = 200;
const RETRY_MIN_MS = 5_000;
const RETRY_MAX_MS = 300_000;

/** What the settings sheet shows about sync. */
export interface SyncState {
  status: 'off' | 'idle' | 'syncing' | 'offline' | 'error';
  /** Last server state received or change confirmed (ISO 8601). */
  lastSync: string | null;
  /** Local changes not yet on the server. */
  pending: number;
}

/** The sync state; `off` when Convex is not configured or nobody is signed in. */
export const syncState = writable<SyncState>({ status: 'off', lastSync: null, pending: 0 });

// --- Persisted bookkeeping ----------------------------------------------------

/** Reads a `localStorage` value, or null on any error. */
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Writes or removes a `localStorage` value, ignoring storage errors. */
function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* Storage blocked: dirty keys then live only in memory. */
  }
}

const dirty = new Set<string>(
  (() => {
    try {
      const v = JSON.parse(read(DIRTY_KEY) ?? '[]');
      return Array.isArray(v) ? v.filter((k): k is string => typeof k === 'string') : [];
    } catch {
      return [];
    }
  })(),
);

/** Persists the dirty keys and publishes their count. */
function saveDirty(): void {
  write(DIRTY_KEY, dirty.size ? JSON.stringify([...dirty]) : null);
  syncState.update((s) => ({ ...s, pending: dirty.size }));
}

// --- Row mapping ----------------------------------------------------------------

/** A server row, as `titles.list` returns it. */
type TitleRow = NonNullable<FunctionReturnType<typeof api.titles.list>>[number];

/** Maps a local title to the mutation shape. */
function toRow(t: StoredTitle): TitleRow {
  return {
    key: t.key,
    mediaType: t.mediaType,
    tmdbId: t.id,
    status: t.status,
    rating: t.rating,
    watchedAt: t.watchedAt,
    title: t.title,
    posterPath: t.posterPath,
    backdropPath: t.backdropPath,
    year: t.year,
    voteAverage: t.voteAverage,
    genreIds: t.genreIds,
    addedAt: t.addedAt,
    updatedAt: t.updatedAt,
  };
}

/** Maps a server row to a local title through `cleanTitle`, so bad rows are rejected. */
function fromRow(r: TitleRow): StoredTitle | null {
  return cleanTitle({ ...r, id: r.tmdbId });
}

/** Splits a list into chunks of `CHUNK_SIZE`. */
function chunks<T>(arr: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += CHUNK_SIZE) out.push(arr.slice(i, i + CHUNK_SIZE));
  return out;
}

// --- Flush and apply ----------------------------------------------------------

let user: CloudUser | null = null;
let flushing: Promise<void> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let retryDelay = RETRY_MIN_MS;
let unsubscribe: (() => void) | null = null;
/** Set for a first sign-in with local data that belongs to nobody yet: merge it on the next state. */
let mergeLocal = false;

/** Sets the status, keeping the rest of the state. */
function setStatus(status: SyncState['status'], synced = false): void {
  syncState.update((s) => ({
    ...s,
    status,
    lastSync: synced ? new Date().toISOString() : s.lastSync,
    pending: dirty.size,
  }));
}

/** Schedules a flush, by default shortly after the last change so a burst sends one request. */
function scheduleFlush(delay = FLUSH_DELAY_MS): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => void flush(), delay);
}

/**
 * Sends the dirty keys to the server: upserts the titles that exist, deletes the rest.
 *
 * Keys changed again while the request is in flight stay dirty for the next flush. Offline,
 * the Convex client holds the mutations until it reconnects. A failure retries later with a
 * growing delay.
 */
async function flush(): Promise<void> {
  if (!user || dirty.size === 0) return;
  if (flushing) return flushing;

  const keys = [...dirty];
  const titles = get(appData).titles;
  const upserts = keys.filter((k) => titles[k]).map((k) => toRow(titles[k]));
  const deletes = keys.filter((k) => !titles[k]);
  const sentVersions = new Map(keys.map((k) => [k, titles[k]?.updatedAt ?? null]));

  setStatus(navigator.onLine ? 'syncing' : 'offline');
  let ok = false;
  flushing = (async () => {
    try {
      const { live } = await getClients();
      for (const part of chunks(upserts)) await live.mutation(api.titles.upsertMany, { titles: part });
      for (const part of chunks(deletes)) await live.mutation(api.titles.removeMany, { keys: part });
      const now = get(appData).titles;
      for (const k of keys) {
        if ((now[k]?.updatedAt ?? null) === sentVersions.get(k)) dirty.delete(k);
      }
      saveDirty();
      retryDelay = RETRY_MIN_MS;
      ok = true;
      setStatus('idle', true);
    } catch (err) {
      console.error('Sync flush failed', err);
      setStatus(navigator.onLine ? 'error' : 'offline');
    } finally {
      flushing = null;
    }
  })();
  await flushing;
  if (!dirty.size || !user) return;
  if (ok) scheduleFlush();
  else {
    scheduleFlush(retryDelay);
    retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
  }
}

/**
 * Applies a server state: replaces the local library with the rows, keeping the local version
 * of dirty keys.
 *
 * Convex resolves a mutation only after the subscriptions include it, so a key leaves the dirty
 * set no earlier than the server state that holds it arrives.
 *
 * @param rows - The user's rows; null while the server does not see a session, which is
 *     ignored so a lost session never reads as an empty account.
 * @param uid - The user the subscription belongs to.
 */
function apply(rows: TitleRow[] | null, uid: string): void {
  if (rows === null || user?.id !== uid) return;
  const local = get(appData).titles;
  const merged: Record<string, StoredTitle> = {};
  for (const row of rows) {
    const t = fromRow(row);
    if (t) merged[t.key] = t;
  }
  for (const k of dirty) {
    if (local[k]) merged[k] = local[k];
    else delete merged[k];
  }
  if (mergeLocal) {
    // First sign-in: upload local titles the account lacks or holds an older version of.
    for (const [k, t] of Object.entries(local)) {
      if (!merged[k] || merged[k].updatedAt < t.updatedAt) {
        merged[k] = t;
        dirty.add(k);
      }
    }
    mergeLocal = false;
    write(OWNER_KEY, uid);
    saveDirty();
  }
  replaceTitles(merged);
  setStatus(flushing ? 'syncing' : 'idle', true);
  if (dirty.size) scheduleFlush();
}

/** Subscribes to the user's titles; every server change arrives here live. */
async function subscribe(uid: string): Promise<void> {
  unsubscribe?.();
  unsubscribe = null;
  const { live } = await getClients();
  if (user?.id !== uid) return;
  unsubscribe = live.onUpdate(
    api.titles.list,
    {},
    (rows) => apply(rows, uid),
    (err) => {
      console.error('Sync subscription failed', err);
      setStatus('error');
    },
  );
}

/**
 * Sends pending changes now; the subscription brings the server state by itself.
 *
 * @return Resolves when the flush finished; failures only change `syncState`.
 */
export async function syncNow(): Promise<void> {
  retryDelay = RETRY_MIN_MS;
  await flush();
}

/**
 * Prepares the local library for a newly signed-in user.
 *
 * Data created before any login (no owner) is merged into the account on the first server
 * state, which migrates a local-only library without overwriting newer server rows. Data owned
 * by another user is dropped, so it never leaks into this account.
 *
 * @param u - The signed-in user.
 */
function adopt(u: CloudUser): void {
  const owner = read(OWNER_KEY);
  if (owner === u.id) return;
  if (owner) {
    dirty.clear();
    saveDirty();
    replaceTitles({});
    write(OWNER_KEY, u.id);
  } else {
    mergeLocal = true;
  }
}

/**
 * Clears the local library and the sync bookkeeping, for an explicit sign-out.
 *
 * Only `signOut` calls it: a session that ends by itself keeps the library and its unsynced
 * changes, and the next sign-in of the same user picks them up.
 */
function forget(): void {
  mergeLocal = false;
  dirty.clear();
  saveDirty();
  write(OWNER_KEY, null);
  replaceTitles({});
  syncState.set({ status: 'off', lastSync: null, pending: 0 });
}

/**
 * Signs out on purpose: clears the local library, then ends the Convex session.
 *
 * @return Resolves when the session is gone.
 */
export async function signOut(): Promise<void> {
  forget();
  await logout();
}

if (cloudEnabled() && typeof window !== 'undefined') {
  onLocalChange((keys) => {
    if (!user) return;
    for (const k of keys) dirty.add(k);
    saveDirty();
    scheduleFlush();
  });

  cloudUser.subscribe((u) => {
    const previous = user;
    user = u;
    if (u && u.id !== previous?.id) {
      adopt(u);
      setStatus(navigator.onLine ? 'syncing' : 'offline');
      void subscribe(u.id);
      if (dirty.size) scheduleFlush();
    } else if (!u && previous) {
      unsubscribe?.();
      unsubscribe = null;
      if (flushTimer) clearTimeout(flushTimer);
      syncState.update((s) => ({ ...s, status: 'off' }));
    }
  });

  window.addEventListener('online', () => {
    if (user) void syncNow();
  });
  window.addEventListener('offline', () => user && setStatus('offline'));
}
