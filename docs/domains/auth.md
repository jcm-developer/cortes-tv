# Auth

## Purpose

Who may open the app. With Supabase configured, a real email and password login whose
session lets the sync layer read and write the user's own rows. Without Supabase, an optional
build-time gate that keeps casual visitors out; with neither, the site is open.

## Key files

- `src/lib/supabase.ts` (`cloudEnabled`, `getClient`): the lazy Supabase client.
- `src/lib/auth.ts` (`cloudUser`, `authReady`, `cloudLogin`, `authRequired`, `session`,
  `login`, `logout`, `authed`): both login modes.
- `src/components/Login.svelte`: the form, email or user name depending on the mode.
- `src/components/App.svelte`: splash while `authReady` is false, `Login` while `authed` is
  false.
- `src/components/Settings.svelte`: account, sync state and "log out".

## Data

- `localStorage["cortes-tv:auth"]`: the Supabase session (access and refresh tokens), managed
  by `supabase-js`.
- `localStorage["cortes-tv:user"]`: the last signed-in cloud user (`id`, `email`), so the app
  opens offline.
- `localStorage["cortes-tv:session"]`: the build-time gate marker, `btoa("v1:" + user)`, with no
  expiry.

## Flow

1. With Supabase, `cloudUser` starts from the cached user and `authReady` is true at once when
   there is one; otherwise a splash shows until `getSession` answers.
2. `getSession` confirms or clears the user; `onAuthStateChange` follows token refreshes and
   sign-outs. `cloudLogin` calls `signInWithPassword` and maps failures to Spanish messages.
3. "Log out" in Settings calls `signOut` in `sync.ts`: it clears the local library, then
   `logout` clears `cloudUser` and signs out locally (`docs/domains/library.md`). A session
   lost by itself only clears `cloudUser`, so the login shows but local data stays.
4. Without Supabase, `login(user, pass)` compares against `PUBLIC_AUTH_USER` (trimmed) and
   `PUBLIC_AUTH_PASSWORD` and stores the marker.

## Invariants

- `authRequired` is true with Supabase, or when both build-time variables are set; with
  Supabase the build-time variables are ignored.
- There is no sign-up in the app: accounts are created in the Supabase dashboard, and sign-ups
  stay disabled there (`docs/operations.md`).
- Supabase errors are logged to the console and never shown raw.

## Gotchas

- No magic link: on iPhone it opens Safari, not the installed PWA, and the session would land
  in Safari's storage.
- Offline with an expired access token, `getSession` fails; the cached user is kept so the app
  still opens, and the token refreshes when the connection returns.
- The build-time credentials ship in the public bundle (`docs/operations.md`); that gate is not
  security.

## Related

- `docs/domains/library.md`: the sync that the session enables.
- `docs/decisions.md`, D7: why Supabase.
