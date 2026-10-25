/**
 * Cloud sync of the library with the Supabase `user_titles` table.
 *
 * The local library stays the source the UI reads, so the app works offline. Local changes
 * mark their keys dirty (persisted, so they survive a reload); a flush upserts or deletes those
 * rows. A pull replaces the local library with the server rows, except dirty keys, which keep
 * the local version until they are flushed. See `docs/domains/library.md`.
 */
import { writable, get } from 'svelte/store';
import { appData, cleanTitle, onLocalChange, replaceTitles } from './store';
import type { StoredTitle } from './types';
import { cloudEnabled, getClient } from './supabase';
import { cloudUser, logout, type CloudUser } from './auth';
import type { SupabaseClient } from '@supabase/supabase-js';

const TABLE = 'user_titles';
const DIRTY_KEY = 'cortes-tv:dirty';
/** Id of the user the local library belongs to; empty for data created before any login. */
const OWNER_KEY = 'cortes-tv:owner';
const FLUSH_DELAY_MS = 800;
const PAGE_SIZE = 1000;
/** Rows per upsert and keys per delete request. */
const CHUNK_SIZE = 200;
const RETRY_MIN_MS = 5_000;
const RETRY_MAX_MS = 300_000;
/** Minimum time between pulls triggered by the app coming back to the foreground. */
const FOCUS_PULL_MS = 30_000;

/** What the settings sheet shows about sync. */
export interface SyncState {
  status: 'off' | 'idle' | 'syncing' | 'offline' | 'error';
  /** Last successful pull or flush (ISO 8601). */
  lastSync: string | null;
  /** Local changes not yet on the server. */
  pending: number;
}

/** The sync state; `off` when Supabase is not configured or nobody is signed in. */
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

/** A `user_titles` row, as Supabase returns it. */
interface TitleRow {
  key: string;
  media_type: string;
  tmdb_id: number;
  status: string;
  rating: number | null;
  watched_at: string | null;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  year: string | null;
  vote_average: number | null;
  genre_ids: number[] | null;
  added_at: string;
  updated_at: string;
}

/** Maps a local title to a row for the signed-in user. */
function toRow(t: StoredTitle, userId: string): TitleRow & { user_id: string } {
  return {
    user_id: userId,
    key: t.key,
    media_type: t.mediaType,
    tmdb_id: t.id,
    status: t.status,
    rating: t.rating,
    watched_at: t.watchedAt,
    title: t.title,
    poster_path: t.posterPath,
    backdrop_path: t.backdropPath,
    year: t.year,
    vote_average: t.voteAverage,
    genre_ids: t.genreIds,
    added_at: t.addedAt,
    updated_at: t.updatedAt,
  };
}

/**
 * Maps a server row to a local title through `cleanTitle`, so bad rows are rejected.
 *
 * @param r - The row, untrusted.
 * @return The title, or null when the row is invalid.
 */
function fromRow(r: TitleRow): StoredTitle | null {
  return cleanTitle({
    id: r.tmdb_id,
    mediaType: r.media_type,
    title: r.title,
    posterPath: r.poster_path,
    backdropPath: r.backdrop_path,
    year: r.year,
    voteAverage: r.vote_average,
    genreIds: r.genre_ids ?? [],
    status: r.status,
    addedAt: r.added_at,
    updatedAt: r.updated_at,
    rating: r.rating,
    watchedAt: r.watched_at,
  });
}

// --- Flush and pull -------------------------------------------------------------

let user: CloudUser | null = null;
let flushing: Promise<void> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let lastPull = 0;
/** Counts successful flushes, so a pull can tell that its rows went stale meanwhile. */
let flushGeneration = 0;
let retryDelay = RETRY_MIN_MS;
/** Set for a first sign-in with local data that belongs to nobody yet: merge it on the next pull. */
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
 * Confirms that the client holds a live session for the expected user.
 *
 * Without one, supabase-js falls back to the anon key and RLS returns no rows instead of an
 * error, which a pull would read as "the account is empty".
 *
 * @param sb - The client.
 * @param uid - The expected user id.
 * @return True when the session belongs to `uid`.
 */
async function hasSession(sb: SupabaseClient, uid: string): Promise<boolean> {
  const { data } = await sb.auth.getSession();
  return data.session?.user.id === uid;
}

/** Splits a list into chunks, so one request never carries an oversized body or URL. */
function chunks<T>(arr: T[], size = CHUNK_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Sends the dirty keys to the server: upserts the titles that exist, deletes the rest.
 *
 * Keys changed again while the request is in flight stay dirty for the next flush. A failure
 * retries later with a growing delay.
 */
async function flush(): Promise<void> {
  if (!user || dirty.size === 0) return;
  if (flushing) return flushing;
  if (!navigator.onLine) return setStatus('offline');

  const uid = user.id;
  const keys = [...dirty];
  const titles = get(appData).titles;
  const upserts = keys.filter((k) => titles[k]).map((k) => toRow(titles[k], uid));
  const deletes = keys.filter((k) => !titles[k]);
  const sentVersions = new Map(keys.map((k) => [k, titles[k]?.updatedAt ?? null]));

  setStatus('syncing');
  let ok = false;
  flushing = (async () => {
    try {
      const sb = await getClient();
      if (!(await hasSession(sb, uid))) throw new Error('No session for the signed-in user');
      for (const part of chunks(upserts)) {
        const { error } = await sb.from(TABLE).upsert(part, { onConflict: 'user_id,key' });
        if (error) throw error;
      }
      for (const part of chunks(deletes)) {
        const { error } = await sb.from(TABLE).delete().eq('user_id', uid).in('key', part);
        if (error) throw error;
      }
      const now = get(appData).titles;
      for (const k of keys) {
        if ((now[k]?.updatedAt ?? null) === sentVersions.get(k)) dirty.delete(k);
      }
      saveDirty();
      flushGeneration++;
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
  else if (navigator.onLine) {
    scheduleFlush(retryDelay);
    retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
  }
}

/**
 * Replaces the local library with the server rows, keeping the local version of dirty keys.
 *
 * A flush that finishes while the rows are downloading makes them stale (they miss that
 * change, and the key is no longer dirty to protect it), so the pull starts over.
 */
async function pull(): Promise<void> {
  if (!user) return;
  if (!navigator.onLine) return setStatus('offline');
  const uid = user.id;
  setStatus('syncing');
  try {
    const sb = await getClient();
    if (!(await hasSession(sb, uid))) throw new Error('No session for the signed-in user');

    let data: TitleRow[] = [];
    for (let attempt = 0; ; attempt++) {
      if (flushing) await flushing;
      const generation = flushGeneration;
      data = [];
      // Page until an empty page: the project's max_rows may be lower than PAGE_SIZE.
      for (let from = 0; ; ) {
        const { data: page, error } = await sb
          .from(TABLE)
          .select('*')
          .eq('user_id', uid)
          .order('key')
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        if (!page || page.length === 0) break;
        data.push(...(page as TitleRow[]));
        from += page.length;
      }
      if (generation === flushGeneration && !flushing) break;
      if (attempt >= 2) return setStatus('idle');
    }
    if (user?.id !== uid) return;

    const local = get(appData).titles;
    const merged: Record<string, StoredTitle> = {};
    for (const row of data) {
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
    lastPull = Date.now();
    setStatus('idle', true);
    if (dirty.size) scheduleFlush();
  } catch (err) {
    console.error('Sync pull failed', err);
    setStatus(navigator.onLine ? 'error' : 'offline');
  }
}

/**
 * Pushes pending changes, then pulls the server state.
 *
 * @return Resolves when both steps finished; failures only change `syncState`.
 */
export async function syncNow(): Promise<void> {
  await flush();
  await pull();
}

/**
 * Prepares the local library for a newly signed-in user.
 *
 * Data created before any login (no owner) is merged into the account on the next pull, which
 * migrates a local-only library on the first sign-in without overwriting newer server rows.
 * Data owned by another user is dropped, so it never leaks into this account.
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
 * Only `signOut` calls it: a session lost by itself (expired refresh token, paused project)
 * keeps the library and its unsynced changes, and the next sign-in of the same user picks
 * them up.
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
 * Signs out on purpose: clears the local library, then ends the Supabase session.
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
      void syncNow();
    }
  });

  window.addEventListener('online', () => void syncNow());
  window.addEventListener('offline', () => user && setStatus('offline'));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastPull > FOCUS_PULL_MS) {
      void syncNow();
    }
  });
}
