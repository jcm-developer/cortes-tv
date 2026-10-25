/**
 * Database schema: the Convex Auth tables plus the library, one row per title and user.
 *
 * See `docs/domains/library.md`.
 */
import { defineSchema, defineTable } from 'convex/server';
import { authTables } from '@convex-dev/auth/server';
import { v } from 'convex/values';

/** The fields of a library title, shared by the table and the mutation validators. */
export const titleFields = {
  key: v.string(),
  mediaType: v.union(v.literal('movie'), v.literal('tv')),
  tmdbId: v.number(),
  status: v.union(v.literal('pending'), v.literal('watched')),
  rating: v.union(v.number(), v.null()),
  watchedAt: v.union(v.string(), v.null()),
  title: v.string(),
  posterPath: v.union(v.string(), v.null()),
  backdropPath: v.union(v.string(), v.null()),
  year: v.union(v.string(), v.null()),
  voteAverage: v.union(v.number(), v.null()),
  genreIds: v.array(v.number()),
  addedAt: v.string(),
  updatedAt: v.string(),
};

export default defineSchema({
  ...authTables,
  titles: defineTable({ userId: v.id('users'), ...titleFields }).index('by_user_key', [
    'userId',
    'key',
  ]),
});
