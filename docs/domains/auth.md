# Auth

## Purpose

An optional single-user login that keeps casual visitors out of the deployed site. The
credentials are build-time variables, so this is a closed door, not security: anyone who reads
the bundle can find them. With no credentials configured, the site is open.

## Key files

- `src/lib/auth.ts` (`authRequired`, `session`, `login`, `logout`, `authed`): the whole gate.
- `src/components/Login.svelte`: the login form, shown by `App.svelte` while `authed` is false.
- `src/components/Settings.svelte`: the "log out" action, only when `authRequired()`.

## Data

- `localStorage["cortes-tv:session"]`: a non-cryptographic marker, `btoa("v1:" + user)`. It
  has no expiry; the session lasts until logout or until storage is cleared.

## Flow

1. `session` starts from `loadSession`: true when the stored marker matches the current one.
2. `App.svelte` renders `Login` while `authed` (`!authRequired() || session`) is false.
3. `login(user, pass)` compares against `PUBLIC_AUTH_USER` (trimmed) and
   `PUBLIC_AUTH_PASSWORD`, stores the marker and sets `session` to true.
4. `logout()` removes the marker and sets `session` to false.

## Invariants

- Auth is required only when both variables are non-empty (`authRequired`).
- The marker embeds the user name, so changing `PUBLIC_AUTH_USER` invalidates old sessions.
  Changing only the password does not.

## Gotchas

- Credentials ship in the public bundle (`docs/operations.md`). Real auth needs a backend
  (`docs/decisions.md`, D1).
- `localStorage` access is wrapped in `try`: private modes that throw on storage just behave
  as logged out.

## Related

- `docs/domains/ui.md` for the app shell that renders the gate.
