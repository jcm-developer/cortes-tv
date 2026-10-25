/**
 * Login: Supabase email and password when cloud sync is configured, otherwise the optional
 * build-time gate.
 *
 * With Supabase, the session is real and lets the sync layer read and write the user's rows.
 * Without it, the credentials come from `PUBLIC_AUTH_USER` and `PUBLIC_AUTH_PASSWORD` and ship
 * in the client bundle, so that gate only closes the door; it is not security. See
 * `docs/domains/auth.md`.
 */
import { writable, derived } from 'svelte/store';
import { cloudEnabled, getClient } from './supabase';

const USER = (import.meta.env.PUBLIC_AUTH_USER ?? '').trim();
const PASS = import.meta.env.PUBLIC_AUTH_PASSWORD ?? '';
const KEY = 'cortes-tv:session';
/** Last signed-in cloud user, so the app opens offline before Supabase answers. */
const USER_KEY = 'cortes-tv:user';

// --- Cloud user ---------------------------------------------------------------

/** The signed-in Supabase user. */
export interface CloudUser {
  id: string;
  email: string;
}

/**
 * Reads the last signed-in cloud user from storage.
 *
 * @return The user, or null when there is none or storage fails.
 */
function loadCachedUser(): CloudUser | null {
  if (!cloudEnabled() || typeof localStorage === 'undefined') return null;
  try {
    const raw = JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
    return raw && typeof raw.id === 'string' ? { id: raw.id, email: String(raw.email ?? '') } : null;
  } catch {
    return null;
  }
}

/** Stores or clears the cached cloud user. */
function cacheUser(user: CloudUser | null): void {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* Storage blocked: the app only loses the offline start. */
  }
}

/** The signed-in Supabase user, or null; starts from the cached user so offline starts work. */
export const cloudUser = writable<CloudUser | null>(loadCachedUser());

/** Whether the first session check finished; until then the app shows neither login nor data. */
export const authReady = writable<boolean>(!cloudEnabled() || loadCachedUser() !== null);

if (cloudEnabled() && typeof window !== 'undefined') {
  getClient()
    .then(async (sb) => {
      const { data, error } = await sb.auth.getSession();
      const u = data.session?.user;
      if (u) setCloudUser({ id: u.id, email: u.email ?? '' });
      // Offline with an expired token: keep the cached user and retry when back online.
      else if (!error || navigator.onLine) setCloudUser(null);
      authReady.set(true);
      sb.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') setCloudUser(null);
        else if (session?.user) setCloudUser({ id: session.user.id, email: session.user.email ?? '' });
      });
    })
    .catch((err) => {
      console.error('Supabase auth init failed', err);
      authReady.set(true);
    });
}

/** Sets the cloud user and its cache, skipping no-op updates. */
function setCloudUser(user: CloudUser | null): void {
  cloudUser.update((current) => (current?.id === user?.id && current?.email === user?.email ? current : user));
  cacheUser(user);
}

/** The outcome of a login attempt, with a Spanish message on failure. */
export interface LoginResult {
  ok: boolean;
  message?: string;
}

/**
 * Signs in to Supabase with email and password.
 *
 * @param email - The account email.
 * @param password - The password.
 * @return The outcome; failures carry a message safe to show.
 */
export async function cloudLogin(email: string, password: string): Promise<LoginResult> {
  try {
    const sb = await getClient();
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) {
      if (error) console.error('Supabase sign-in failed', error);
      if (!navigator.onLine) return { ok: false, message: 'Sin conexión. Inténtalo de nuevo.' };
      return { ok: false, message: 'Email o contraseña incorrectos.' };
    }
    setCloudUser({ id: data.user.id, email: data.user.email ?? '' });
    return { ok: true };
  } catch (err) {
    console.error('Supabase sign-in failed', err);
    return { ok: false, message: 'No se pudo conectar. Inténtalo de nuevo.' };
  }
}

// --- Build-time gate ----------------------------------------------------------

/**
 * Checks whether a login is required.
 *
 * @return True with Supabase, or when both build-time credentials are set; false means open
 *     access.
 */
export const authRequired = (): boolean => cloudEnabled() || Boolean(USER && PASS);

/**
 * Returns the session marker stored on a build-time login.
 *
 * It embeds the user name, so changing the configured user invalidates old sessions.
 *
 * @return The marker, base64 encoded when `btoa` accepts the input.
 */
function marker(): string {
  // Not cryptographic: it only has to change when the configured user changes.
  try {
    return btoa(`v1:${encodeURIComponent(USER)}`);
  } catch {
    return `v1:${USER}`;
  }
}

/**
 * Reads the stored build-time session and checks it against the current marker.
 *
 * @return True when a valid session is stored; false without storage or on any storage error.
 */
function loadSession(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(KEY) === marker();
  } catch {
    return false;
  }
}

/** Whether the user passed the build-time gate, restored from storage on load. */
export const session = writable<boolean>(loadSession());

/**
 * Logs in through the build-time gate when the credentials match, and stores the session.
 *
 * @param user - The user name; surrounding spaces are ignored.
 * @param pass - The password, compared as typed.
 * @return True when the credentials match.
 */
export function login(user: string, pass: string): boolean {
  if (user.trim() === USER && pass === PASS) {
    try {
      localStorage.setItem(KEY, marker());
    } catch {
      /* ignore */
    }
    session.set(true);
    return true;
  }
  return false;
}

/**
 * Logs out: signs out of Supabase, or removes the build-time session.
 *
 * With Supabase, callers use `signOut` in `sync.ts`, which also clears the local library.
 */
export async function logout(): Promise<void> {
  if (cloudEnabled()) {
    setCloudUser(null);
    try {
      const sb = await getClient();
      await sb.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.error('Supabase sign-out failed', err);
    }
    return;
  }
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  session.set(false);
}

/** Whether the app may be shown. */
export const authed = derived([session, cloudUser], ([s, u]) =>
  cloudEnabled() ? u !== null : !authRequired() || s,
);
