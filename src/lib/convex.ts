/**
 * Convex client and Convex Auth session, without React.
 *
 * A port of the token handling in `@convex-dev/auth/react`: the access token (a JWT, about one
 * hour) and the refresh token live in `localStorage`; the realtime client asks for a fresh
 * access token through `fetchToken`, which trades the refresh token over a separate HTTP client
 * so the refresh never waits on the socket it is unblocking. See `docs/domains/auth.md`.
 */
import type { ConvexClient, ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';

const URL = (import.meta.env.PUBLIC_CONVEX_URL ?? '').trim();
/** `localStorage` key of the Convex Auth tokens. */
const TOKENS_KEY = 'cortes-tv:auth';

/**
 * Checks whether cloud sync and login are configured.
 *
 * @return True when the Convex deployment URL is set.
 */
export const cloudEnabled = (): boolean => Boolean(URL);

/** The Convex Auth token pair. */
interface Tokens {
  token: string;
  refreshToken: string;
}

/** Reads the stored tokens, or null. */
function readTokens(): Tokens | null {
  try {
    const raw = JSON.parse(localStorage.getItem(TOKENS_KEY) ?? 'null');
    return raw && typeof raw.token === 'string' && typeof raw.refreshToken === 'string' ? raw : null;
  } catch {
    return null;
  }
}

/** Stores or clears the tokens. */
function writeTokens(tokens: Tokens | null): void {
  try {
    if (tokens) localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    else localStorage.removeItem(TOKENS_KEY);
  } catch {
    /* Storage blocked: the session lasts until the page closes. */
  }
}

/**
 * Returns the user id inside a Convex Auth JWT (`sub` is `userId|sessionId`).
 *
 * @param token - The access token.
 * @return The user id, or null when the token cannot be read.
 */
function userIdOf(token: string): string | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const sub = JSON.parse(atob(payload)).sub;
    return typeof sub === 'string' ? sub.split('|')[0] : null;
  } catch {
    return null;
  }
}

/**
 * Checks whether a stored session exists, without any network call.
 *
 * @return The user id of the stored session, or null.
 */
export function storedUserId(): string | null {
  const t = cloudEnabled() ? readTokens() : null;
  return t ? userIdOf(t.token) : null;
}

let clients: Promise<{ live: ConvexClient; http: ConvexHttpClient }> | null = null;
/** Called when the server ends the session (refresh rejected), not on network errors. */
let onSessionEnded: () => void = () => {};

/**
 * Registers what happens when the server ends the session.
 *
 * @param fn - Called once per ended session.
 */
export function setSessionEndedHandler(fn: () => void): void {
  onSessionEnded = fn;
}

/**
 * Trades the stored refresh token for a new token pair.
 *
 * A network failure keeps the stored tokens and returns null, so an offline start stays signed
 * in; only an answer from the server without tokens ends the session.
 *
 * @param http - The HTTP client.
 * @return The new access token, or null.
 */
async function refresh(http: ConvexHttpClient): Promise<string | null> {
  const run = async () => {
    const stored = readTokens();
    if (!stored) return null;
    let result: { tokens?: Tokens | null };
    try {
      result = await http.action(api.auth.signIn, { refreshToken: stored.refreshToken });
    } catch (err) {
      if (!navigator.onLine || err instanceof TypeError) return null;
      console.error('Convex token refresh failed', err);
      writeTokens(null);
      onSessionEnded();
      return null;
    }
    if (!result.tokens) {
      writeTokens(null);
      onSessionEnded();
      return null;
    }
    writeTokens(result.tokens);
    return result.tokens.token;
  };
  // One refresh at a time across tabs: a refresh token is single use.
  return navigator.locks ? navigator.locks.request(TOKENS_KEY, run) : run();
}

/**
 * Returns the shared clients, loading the Convex library on first use.
 *
 * The import is dynamic so a build without `PUBLIC_CONVEX_URL` never downloads it.
 *
 * @return The realtime client (queries, mutations) and the HTTP client (auth calls).
 * @throws Error When Convex is not configured.
 */
export function getClients(): Promise<{ live: ConvexClient; http: ConvexHttpClient }> {
  if (!cloudEnabled()) return Promise.reject(new Error('Convex is not configured'));
  clients ??= import('convex/browser').then(({ ConvexClient, ConvexHttpClient }) => {
    const live = new ConvexClient(URL);
    const http = new ConvexHttpClient(URL);
    if (readTokens()) authenticate(live, http);
    return { live, http };
  });
  return clients;
}

/** Hands the realtime client the token source for the stored session. */
function authenticate(live: ConvexClient, http: ConvexHttpClient): void {
  live.setAuth(async ({ forceRefreshToken }) =>
    forceRefreshToken ? refresh(http) : (readTokens()?.token ?? null),
  );
}

/** The outcome of a sign-in attempt; `error` is a stable code for the UI. */
export interface SignInResult {
  userId: string | null;
  error?: 'not-allowed' | 'invalid' | 'network';
}

/**
 * Signs in with email and password. Accounts are never created from the app
 * (`docs/domains/auth.md`).
 *
 * @param email - The account email.
 * @param password - The password.
 * @return The user id on success, or an error code.
 */
export async function passwordSignIn(email: string, password: string): Promise<SignInResult> {
  try {
    const { live, http } = await getClients();
    const result = await http.action(api.auth.signIn, {
      provider: 'password',
      params: { email: email.trim().toLowerCase(), password, flow: 'signIn' },
    });
    if (!result.tokens) return { userId: null, error: 'invalid' };
    writeTokens(result.tokens);
    authenticate(live, http);
    return { userId: userIdOf(result.tokens.token) };
  } catch (err) {
    console.error('Convex sign-in failed', err);
    if (!navigator.onLine || err instanceof TypeError) return { userId: null, error: 'network' };
    const data = (err as { data?: unknown }).data;
    if (data === 'EMAIL_NOT_ALLOWED' || String(err).includes('EMAIL_NOT_ALLOWED')) {
      return { userId: null, error: 'not-allowed' };
    }
    return { userId: null, error: 'invalid' };
  }
}

/** Ends the session on the server when reachable, and forgets the tokens. */
export async function endSession(): Promise<void> {
  if (!cloudEnabled()) return;
  const { live, http } = await getClients();
  const stored = readTokens();
  if (stored) {
    try {
      http.setAuth(stored.token);
      await http.action(api.auth.signOut, {});
    } catch (err) {
      console.error('Convex sign-out failed', err);
    }
  }
  writeTokens(null);
  live.client.clearAuth();
}
