/**
 * Login: Convex Auth email and password when cloud sync is configured, otherwise the optional
 * build-time gate.
 *
 * With Convex, the session is real and lets the sync layer read and write the user's rows.
 * Without it, the credentials come from `PUBLIC_AUTH_USER` and `PUBLIC_AUTH_PASSWORD` and ship
 * in the client bundle, so that gate only closes the door; it is not security. See
 * `docs/domains/auth.md`.
 */
import { writable, derived } from 'svelte/store';
import {
  cloudEnabled,
  endSession,
  getClients,
  passwordSignIn,
  setSessionEndedHandler,
  storedUserId,
} from './convex';

const USER = (import.meta.env.PUBLIC_AUTH_USER ?? '').trim();
const PASS = import.meta.env.PUBLIC_AUTH_PASSWORD ?? '';
const KEY = 'cortes-tv:session';
/** Email of the signed-in cloud user, for Settings; the id comes from the stored token. */
const EMAIL_KEY = 'cortes-tv:email';

// --- Cloud user ---------------------------------------------------------------

/** The signed-in Convex user. */
export interface CloudUser {
  id: string;
  email: string;
}

/**
 * Returns the user of the stored session, with no network call, so the app opens offline.
 *
 * @return The user, or null when there is no stored session.
 */
function loadStoredUser(): CloudUser | null {
  if (typeof localStorage === 'undefined') return null;
  const id = storedUserId();
  if (!id) return null;
  let email = '';
  try {
    email = localStorage.getItem(EMAIL_KEY) ?? '';
  } catch {
    /* ignore */
  }
  return { id, email };
}

/** The signed-in Convex user, or null. */
export const cloudUser = writable<CloudUser | null>(loadStoredUser());

/** Whether the first session check finished; the stored session is read synchronously. */
export const authReady = writable<boolean>(true);

if (cloudEnabled() && typeof window !== 'undefined') {
  // The server rejected the refresh token: show the login. Local data stays (`sync.ts`).
  setSessionEndedHandler(() => cloudUser.set(null));
  // Opens the socket early so the first sync starts as soon as possible.
  if (loadStoredUser()) void getClients();
}

/** The outcome of a login attempt, with a Spanish message on failure. */
export interface LoginResult {
  ok: boolean;
  message?: string;
}

/**
 * Signs in to Convex with email and password.
 *
 * @param email - The account email.
 * @param password - The password.
 * @return The outcome; failures carry a message safe to show.
 */
export async function cloudLogin(email: string, password: string): Promise<LoginResult> {
  const res = await passwordSignIn(email, password);
  if (!res.userId) {
    if (res.error === 'network') return { ok: false, message: 'Sin conexión. Inténtalo de nuevo.' };
    if (res.error === 'not-allowed') return { ok: false, message: 'Este email no tiene acceso.' };
    return { ok: false, message: 'Email o contraseña incorrectos.' };
  }
  const user = { id: res.userId, email: email.trim().toLowerCase() };
  try {
    localStorage.setItem(EMAIL_KEY, user.email);
  } catch {
    /* ignore */
  }
  cloudUser.set(user);
  return { ok: true };
}

// --- Build-time gate ----------------------------------------------------------

/**
 * Checks whether a login is required.
 *
 * @return True with Convex, or when both build-time credentials are set; false means open
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
 * Logs out: ends the Convex session, or removes the build-time session.
 *
 * With Convex, callers use `signOut` in `sync.ts`, which also clears the local library.
 */
export async function logout(): Promise<void> {
  if (cloudEnabled()) {
    cloudUser.set(null);
    try {
      localStorage.removeItem(EMAIL_KEY);
    } catch {
      /* ignore */
    }
    await endSession();
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
