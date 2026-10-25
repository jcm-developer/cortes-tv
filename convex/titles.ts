/**
 * Library functions: every call works on the signed-in user's own rows only.
 *
 * See `docs/domains/library.md`.
 */
import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError, v } from 'convex/values';
import { mutation, query, type MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { titleFields } from './schema';

/** Upper bound of titles or keys per call; the client sends chunks of this size. */
const MAX_BATCH = 200;

/**
 * Returns the signed-in user id.
 *
 * @param ctx - The function context.
 * @return The user id.
 * @throws ConvexError `UNAUTHENTICATED` when nobody is signed in.
 */
async function requireUser(ctx: Parameters<typeof getAuthUserId>[0]): Promise<Id<'users'>> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError('UNAUTHENTICATED');
  return userId;
}

/**
 * Finds a title row of the user by key.
 *
 * @param ctx - The mutation context.
 * @param userId - The owner.
 * @param key - The title key, `mediaType:id`.
 * @return The row, or null.
 */
function findTitle(ctx: MutationCtx, userId: Id<'users'>, key: string) {
  return ctx.db
    .query('titles')
    .withIndex('by_user_key', (q) => q.eq('userId', userId).eq('key', key))
    .unique();
}

/** Every title of the signed-in user; null when nobody is signed in. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const rows = await ctx.db
      .query('titles')
      .withIndex('by_user_key', (q) => q.eq('userId', userId))
      .collect();
    return rows.map(({ _id, _creationTime, userId: _owner, ...t }) => t);
  },
});

/**
 * Inserts or updates titles. A row the server holds with a newer `updatedAt` is kept, so an
 * older device never overwrites a newer change.
 */
export const upsertMany = mutation({
  args: { titles: v.array(v.object(titleFields)) },
  handler: async (ctx, { titles }) => {
    const userId = await requireUser(ctx);
    if (titles.length > MAX_BATCH) throw new ConvexError('BATCH_TOO_LARGE');
    for (const t of titles) {
      if (t.key !== `${t.mediaType}:${t.tmdbId}`) throw new ConvexError('INVALID_KEY');
      const clean = {
        ...t,
        // Only watched titles carry a rating or a date (docs/domains/library.md).
        rating: t.status === 'watched' ? t.rating : null,
        watchedAt: t.status === 'watched' ? t.watchedAt : null,
      };
      const existing = await findTitle(ctx, userId, t.key);
      if (!existing) await ctx.db.insert('titles', { userId, ...clean });
      else if (existing.updatedAt <= t.updatedAt) await ctx.db.patch(existing._id, clean);
    }
  },
});

/** Deletes titles by key. */
export const removeMany = mutation({
  args: { keys: v.array(v.string()) },
  handler: async (ctx, { keys }) => {
    const userId = await requireUser(ctx);
    if (keys.length > MAX_BATCH) throw new ConvexError('BATCH_TOO_LARGE');
    for (const key of keys) {
      const existing = await findTitle(ctx, userId, key);
      if (existing) await ctx.db.delete(existing._id);
    }
  },
});
