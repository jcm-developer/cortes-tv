/**
 * Lazy Supabase client, created only when the cloud variables are set.
 *
 * The key is the public anon (or publishable) key: it ships in the bundle by design, and row
 * level security on `user_titles` keeps each user's rows private (`supabase/schema.sql`). See
 * `docs/domains/auth.md` and `docs/domains/library.md`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

const URL = (import.meta.env.PUBLIC_SUPABASE_URL ?? '').trim();
const KEY = (import.meta.env.PUBLIC_SUPABASE_KEY ?? '').trim();

/** `localStorage` key of the Supabase auth session. */
const AUTH_STORAGE_KEY = 'cortes-tv:auth';

/**
 * Checks whether cloud sync and login are configured.
 *
 * @return True when both the Supabase URL and key are set.
 */
export const cloudEnabled = (): boolean => Boolean(URL && KEY);

let client: Promise<SupabaseClient> | null = null;

/**
 * Returns the shared Supabase client, loading the library on first use.
 *
 * The import is dynamic so a build without Supabase variables never downloads it.
 *
 * @return The client.
 * @throws Error When cloud sync is not configured.
 */
export function getClient(): Promise<SupabaseClient> {
  if (!cloudEnabled()) return Promise.reject(new Error('Supabase is not configured'));
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL, KEY, {
      auth: {
        storageKey: AUTH_STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
        // Login is email and password only; there is no redirect to read a session from.
        detectSessionInUrl: false,
      },
    }),
  );
  return client;
}
