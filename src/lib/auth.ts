/**
 * Single-user login for a static site.
 *
 * The credentials are set at build time (`PUBLIC_AUTH_USER`, `PUBLIC_AUTH_PASSWORD`) and ship in
 * the client bundle, so this only closes the door; it is not real security. The session is
 * kept in `localStorage` with no expiry. See `docs/domains/auth.md`.
 */
import { writable, derived } from 'svelte/store';

const USER = (import.meta.env.PUBLIC_AUTH_USER ?? '').trim();
const PASS = import.meta.env.PUBLIC_AUTH_PASSWORD ?? '';
const KEY = 'cortes-tv:session';

/**
 * Checks whether login credentials are configured.
 *
 * @return True when both the user and the password are set; false means open access.
 */
export const authRequired = (): boolean => Boolean(USER && PASS);

/**
 * Returns the session marker stored on login.
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
 * Reads the stored session and checks it against the current marker.
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

/** Whether the user has logged in, restored from storage on load. */
export const session = writable<boolean>(loadSession());

/**
 * Logs in when the credentials match the configured ones, and stores the session.
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

/** Logs out: removes the stored session and clears `session`. */
export function logout(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  session.set(false);
}

/** Whether the app may be shown: true when login is not required or the session is valid. */
export const authed = derived(session, (s) => !authRequired() || s);
