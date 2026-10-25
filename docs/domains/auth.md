# Auth

## Purpose

Who may open the app. With Convex configured, a real email and password login (Convex Auth)
whose session lets the sync layer read and write the user's own rows. Without Convex, an
optional build-time gate that keeps casual visitors out; with neither, the site is open.

## Key files

- `convex/auth.ts`, `convex/auth.config.ts`, `convex/http.ts`: Convex Auth on the server; the
  Password provider rejects any email but `AUTH_ALLOWED_EMAIL`.
- `src/lib/convex.ts` (`cloudEnabled`, `getClients`, `passwordSignIn`, `endSession`,
  `storedUserId`, `setSessionEndedHandler`): the lazy clients and the token handling.
- `src/lib/auth.ts` (`cloudUser`, `authReady`, `cloudLogin`, `authRequired`, `session`,
  `login`, `logout`, `authed`): both login modes.
- `src/components/Login.svelte`: the form; with Convex it also offers "create account" for the
  first time.
- `src/components/App.svelte`: splash while `authReady` is false, `Login` while `authed` is
  false.
- `src/components/Settings.svelte`: account, sync state and "log out".

## Data

- `localStorage["cortes-tv:auth"]`: the Convex Auth tokens, `{ token, refreshToken }`. The
  access token is a JWT of about one hour whose `sub` is `userId|sessionId`; the refresh token
  is single use.
- `localStorage["cortes-tv:email"]`: the signed-in email, shown in Settings.
- Server: the Convex Auth tables (`users`, `authAccounts`, `authSessions`, ...) in
  `convex/schema.ts`. Sessions last up to a year, or 90 days without use.
- `localStorage["cortes-tv:session"]`: the build-time gate marker, `btoa("v1:" + user)`, with no
  expiry.

## Flow

1. With Convex, `cloudUser` starts from the stored tokens (user id read from the JWT, no
   network), so the app opens at once, offline too. `authReady` is always true.
2. `cloudLogin` calls the `auth:signIn` action over HTTP (`passwordSignIn`) with flow
   `signIn` or `signUp`, stores the tokens and hands the realtime client a token source
   (`authenticate`). Errors map to Spanish messages: not allowed, wrong credentials, offline.
3. When the access token expires, the realtime client asks for a new one; `refresh` trades the
   refresh token over the HTTP client, one tab at a time (`navigator.locks`). A network
   failure keeps the tokens (offline start); a rejection from the server ends the session:
   `cloudUser` becomes null and the login shows, local data stays.
4. "Log out" in Settings calls `signOut` in `sync.ts`: it clears the local library, then
   `logout` calls `auth:signOut` and forgets the tokens (`docs/domains/library.md`).
5. Without Convex, `login(user, pass)` compares against `PUBLIC_AUTH_USER` (trimmed) and
   `PUBLIC_AUTH_PASSWORD` and stores the marker.

## Invariants

- `authRequired` is true with Convex, or when both build-time variables are set; with Convex
  the build-time variables are ignored.
- Only `AUTH_ALLOWED_EMAIL` can create an account: the Password provider's `profile` throws
  `EMAIL_NOT_ALLOWED` for any other email, on every flow.
- Every function in `convex/titles.ts` reads the user from the session (`getAuthUserId`);
  `list` answers null without one, the mutations throw `UNAUTHENTICATED`.
- Auth errors are logged to the console and never shown raw.

## Gotchas

- No email links: on iPhone they open Safari, not the installed PWA. Password only, so there
  is no "forgot password"; reset it from the Convex dashboard (delete the user's
  `authAccounts` row and create the account again).
- Refresh calls go over `ConvexHttpClient`, never the realtime client, which waits for the
  token the refresh is producing.
- The build-time credentials ship in the public bundle (`docs/operations.md`); that gate is not
  security.

## Related

- `docs/domains/library.md`: the sync that the session enables.
- `docs/decisions.md`, D8: why Convex.
