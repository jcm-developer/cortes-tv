/**
 * Convex Auth: email and password, limited to the one email in `AUTH_ALLOWED_EMAIL`.
 *
 * Sign-up is open in the protocol, so the allow list is what keeps strangers from creating an
 * account on this deployment. See `docs/domains/auth.md`.
 */
import { convexAuth } from '@convex-dev/auth/server';
import { Password } from '@convex-dev/auth/providers/Password';
import { ConvexError } from 'convex/values';

const DAY_MS = 24 * 60 * 60 * 1000;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = String(params.email ?? '').trim().toLowerCase();
        const allowed = (process.env.AUTH_ALLOWED_EMAIL ?? '').trim().toLowerCase();
        if (!allowed || email !== allowed) throw new ConvexError('EMAIL_NOT_ALLOWED');
        return { email };
      },
    }),
  ],
  // An installed app may stay closed for weeks; keep the session alive long enough.
  session: { totalDurationMs: 365 * DAY_MS, inactiveDurationMs: 90 * DAY_MS },
});
